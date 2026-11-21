
import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import makeWASocket, {
  DisconnectReason,
} from "@whiskeysockets/baileys";

import { criarEstadoAutenticacao } from "./auth-state.js";
import qrcode from "qrcode-terminal";
import pino from "pino";

import {
  buscarNotificacao,
  listarNotificacoesPendentes,
  reivindicarNotificacao,
  marcarComoEnviada,
  marcarComoFalha,
  marcarComoIncerta,
  recuperarProcessamentosInterrompidos,
  fecharBanco,
} from "./database.js";

const app = express();

app.use(express.json({ limit: "10kb" }));

const PORT = Number(process.env.PORT) || 3001;
const API_SECRET = process.env.API_SECRET;

if (!API_SECRET || API_SECRET.length < 40) {
  throw new Error("API_SECRET ausente ou inválido.");
}

const STORE_NUMBER = (process.env.STORE_WHATSAPP_NUMBER || "").replace(/\D/g, "");

if (!/^55\d{10,11}$/.test(STORE_NUMBER)) {
  throw new Error("STORE_WHATSAPP_NUMBER inválido.");
}

const STORE_JID = `${STORE_NUMBER}@s.whatsapp.net`;

let socket;
let statusWhatsApp = "disconnected";
let connecting = false;
let reconnectTimer;
let filaTimer;
let processandoFila = false;

recuperarProcessamentosInterrompidos()
  .then((recuperadas) => {
    if (recuperadas > 0) {
      console.log(
        `${recuperadas} processamento(s) interrompido(s) precisam de conferência.`
      );
    }
  })
.catch((erro) => {
  console.error(
    "Falha ao recuperar processamentos interrompidos:",
    erro.message
  );
});

function autenticar(req, res, next) {
  const recebido = Buffer.from(req.headers.authorization || "");
  const esperado = Buffer.from(`Bearer ${API_SECRET}`);

  if (
    recebido.length !== esperado.length ||
    !crypto.timingSafeEqual(recebido, esperado)
  ) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  next();
}

async function conectarWhatsApp() {
  if (connecting || statusWhatsApp === "connected") return;

  connecting = true;
  statusWhatsApp = "connecting";

  try {
        const { state, saveCreds } =
            await criarEstadoAutenticacao();

    socket = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("QR Code de conexão:");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        statusWhatsApp = "connected";
        connecting = false;
        console.log("WhatsApp conectado.");
      }

      if (connection === "close") {
        connecting = false;
        socket = undefined;

        const codigo = lastDisconnect?.error?.output?.statusCode;

        if (codigo === DisconnectReason.loggedOut) {
          statusWhatsApp = "logged_out";
          console.log("Sessão desconectada. Nova autenticação necessária.");
          return;
        }

        statusWhatsApp = "disconnected";

        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          conectarWhatsApp().catch(() => {
            statusWhatsApp = "error";
            connecting = false;
          });
        }, 5000);
      }
    });
  } catch {
    connecting = false;
    statusWhatsApp = "error";
    console.error("Não foi possível iniciar a conexão WhatsApp.");
  }
}

app.get("/health", (_req, res) => {
  res.json({
    status: "online",
    service: "Agape WhatsApp Service",
  });
});

async function processarFila() {
  if (
    processandoFila ||
    statusWhatsApp !== "connected" ||
    !socket
  ) {
    return;
  }

  processandoFila = true;

  try {
    const notificacoes = await listarNotificacoesPendentes();

    for (const notificacao of notificacoes) {
      if (statusWhatsApp !== "connected" || !socket) {
        break;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:${PORT}/internal/send-order`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${API_SECRET}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(notificacao),
            signal: AbortSignal.timeout(30000),
          }
        );

        if (response.ok) {
          console.log(
            `Notificação enviada: ${notificacao.notificationId}`
          );
        } else {
          console.error(
            `Notificação ${notificacao.notificationId}: HTTP ${response.status}`
          );
        }
      } catch {
        console.error(
          `Falha ao processar notificação ${notificacao.notificationId}.`
        );
      }
    }
  } catch {
    console.error("Não foi possível consultar a fila de notificações.");
  } finally {
    processandoFila = false;
  }
}

app.get("/internal/health", autenticar, (_req, res) => {
  res.json({
    status: "online",
    authenticated: true,
    whatsapp: statusWhatsApp,
  });
});

app.post("/internal/send-order", autenticar, async (req, res) => {
  const { notificationId, orderId, customerName, items, amount } = req.body;

  if (
    typeof notificationId !== "string" ||
    notificationId.trim().length < 1 ||
    notificationId.length > 100 ||
    typeof orderId !== "string" ||
    orderId.trim().length < 1 ||
    orderId.length > 100 ||
    typeof customerName !== "string" ||
    customerName.trim().length < 1 ||
    customerName.length > 100 ||
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 30 ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      error: "Dados do pedido inválidos.",
    });
  }

  const itensValidos = items.every(
    (item) =>
      item &&
      typeof item.name === "string" &&
      item.name.trim().length > 0 &&
      item.name.length <= 150 &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      item.quantity <= 100
  );

  if (!itensValidos) {
    return res.status(400).json({
      error: "Itens do pedido inválidos.",
    });
  }

  let registro;

  try {
    registro = await buscarNotificacao(notificationId);
  } catch {
    return res.status(500).json({
      error: "Não foi possível consultar a notificação.",
    });
  }

if (registro?.status === "sent") {
  return res.json({
    status: "sent",
    duplicate: true,
  });
}

  if (registro?.status === "processing") {
    return res.status(409).json({
      status: "processing",
      error: "Notificação já está sendo processada.",
    });
  }

  if (registro?.status === "unknown") {
    return res.status(409).json({
      status: "manual_review",
      error: "Resultado incerto. Conferência manual necessária.",
    });
  }

  if (registro?.attempts >= 5) {
    return res.status(429).json({
      status: "limit_reached",
      error: "Limite de tentativas atingido.",
    });
  }

  if (statusWhatsApp !== "connected" || !socket) {
    return res.status(503).json({
      status: "disconnected",
      error: "WhatsApp desconectado.",
    });
  }

  let reivindicada;

  try {
    reivindicada = await reivindicarNotificacao(notificationId);
  } catch {
    return res.status(500).json({
      error: "Não foi possível registrar a tentativa.",
    });
  }

  if (!reivindicada) {
    const atual = await buscarNotificacao(notificationId);

    if (atual?.status === "sent") {
    return res.json({
        status: "sent",
        duplicate: true,
    });
    }

    return res.status(409).json({
      status: atual?.status || "conflict",
      error: "Notificação não pode ser processada neste momento.",
    });
  }

  const formatador = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const listaItens = items
    .map((item) => `• ${item.name.trim()} — ${item.quantity} un.`)
    .join("\n");

  const mensagem = [
    "AGAPE STREETWEAR — NOVO PEDIDO PAGO",
    "",
    `Pedido: ${orderId}`,
    `Cliente: ${customerName.trim()}`,
    "",
    "Produtos:",
    listaItens,
    "",
    `Total: ${formatador.format(amount)}`,
    "Pagamento: aprovado",
  ].join("\n");

  let envioIniciado = false;

  try {
    envioIniciado = true;

    const resultado = await socket.sendMessage(STORE_JID, {
      text: mensagem,
    });

    const messageId = resultado?.key?.id || null;

    const atualizado = await marcarComoEnviada(
    notificationId,
    messageId
    );

    if (atualizado.changes !== 1) {
      throw new Error("Não foi possível confirmar o registro do envio.");
    }

    return res.json({
      status: "sent",
      messageId,
    });
  } catch {
    console.error("Resultado do envio não pôde ser confirmado.");

    try {
      if (envioIniciado) {
        await marcarComoIncerta(
          notificationId,
          "Resultado do envio não pôde ser confirmado."
        );
      } else {
        await marcarComoFalha(
          notificationId,
          "Falha antes do início do envio."
        );
      }
    } catch {
      console.error("Não foi possível atualizar o estado da notificação.");
    }

    return res.status(502).json({
      status: envioIniciado ? "unknown" : "failed",
      error: envioIniciado
        ? "Resultado incerto. Conferência manual necessária."
        : "Falha no envio.",
    });
  }
});

app.post("/internal/connect", autenticar, async (_req, res) => {
  if (connecting || statusWhatsApp === "connected") {
    return res.status(409).json({
      error: "Conexão já iniciada ou ativa.",
      whatsapp: statusWhatsApp,
    });
  }

  conectarWhatsApp().catch(() => {
    statusWhatsApp = "error";
    connecting = false;
  });

  res.status(202).json({
    status: "connection_starting",
  });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serviço iniciado na porta ${PORT}`);

  processarFila().catch(() => {});

  filaTimer = setInterval(() => {
    processarFila().catch(() => {});
  }, 30000);
});

function encerrar() {
  clearTimeout(reconnectTimer);
  clearInterval(filaTimer);

  server.close(() => {
    try {
      fecharBanco();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
