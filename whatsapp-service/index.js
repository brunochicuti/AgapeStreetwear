
import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import makeWASocket, {
  DisconnectReason,
} from "@whiskeysockets/baileys";

import {
  criarEstadoAutenticacao,
  limparEstadoAutenticacao,
} from "./auth-state.js";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
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

app.get("/", (_req, res) => {
  res.sendFile(fileURLToPath(new URL("./qr.html", import.meta.url)));
});

const PORT = Number(process.env.PORT) || 3001;

const INSTANCE_ID = `${process.pid}-${crypto.randomUUID().slice(0, 8)}`;

console.log(`[Processo] Instância ${INSTANCE_ID} iniciada.`);

const API_SECRET = process.env.API_SECRET;

console.log(
  "[config] API_SECRET:",
  "tamanho =", API_SECRET?.length,
  "fingerprint =",
  API_SECRET
    ? crypto.createHash("sha256").update(API_SECRET).digest("hex").slice(0, 12)
    : "ausente"
);

const QR_VIEW_SECRET = process.env.QR_VIEW_SECRET;

if (!QR_VIEW_SECRET || QR_VIEW_SECRET.length < 40) {
  throw new Error("QR_VIEW_SECRET ausente ou inválido.");
}

if (!API_SECRET || API_SECRET.length < 40) {
  throw new Error("API_SECRET ausente ou inválido.");
}

const STORE_NUMBER = (process.env.STORE_WHATSAPP_NUMBER || "").replace(/\D/g, "");

if (!/^55\d{10,11}$/.test(STORE_NUMBER)) {
  throw new Error("STORE_WHATSAPP_NUMBER inválido.");
}

const STORE_JID = `${STORE_NUMBER}@s.whatsapp.net`;

let socket;
let socketId = 0;
let qrCodeDataUrl = null;
let statusWhatsApp = "disconnected";
let connecting = false;
let desconectando = false;
let reconnectTimer;
let filaTimer;
let processandoFila = false;

recuperarProcessamentosInterrompidos()
  .then((recuperadas) => {
    console.log(
      `Recuperação da fila concluída. Registros recuperados: ${recuperadas}.`
    );
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

function autenticarQr(req, res, next) {
  const recebido = Buffer.from(req.headers.authorization || "");
  const esperado = Buffer.from(`Bearer ${QR_VIEW_SECRET}`);

  if (
    recebido.length !== esperado.length ||
    !crypto.timingSafeEqual(recebido, esperado)
  ) {
    return res.status(401).json({
      error: "Acesso não autorizado.",
    });
  }

  next();
}


async function conectarWhatsApp() {
  if (connecting || statusWhatsApp === "connected") return;

  connecting = true;
  statusWhatsApp = "connecting";

  const tentativaId = ++socketId;
  console.log(`[WhatsApp][${INSTANCE_ID}] Iniciando socket #${tentativaId}`);

  let novoSocket;

  try {
    const { state, saveCreds } = await criarEstadoAutenticacao();

    novoSocket = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    socket = novoSocket;

    novoSocket.ev.on("creds.update", saveCreds);

    novoSocket.ev.on("connection.update", (update) => {
      // Ignora eventos de sockets antigos.
      if (socket !== novoSocket) {
        console.log(
          `[WhatsApp] Evento ignorado do socket antigo #${tentativaId}.`
        );
        return;
      }

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        QRCode.toDataURL(qr)
          .then((imagem) => {
            if (socket === novoSocket) {
              qrCodeDataUrl = imagem;
              console.log("QR Code atualizado para vinculação.");
            }
          })
          .catch(() => {
            console.error("Falha ao gerar imagem do QR Code.");
          });
      }

      if (connection === "open") {
        statusWhatsApp = "connected";
        connecting = false;
        console.log(
          `[WhatsApp][${INSTANCE_ID}] Socket #${tentativaId} conectado (evento open).`
        );
        console.log("WhatsApp conectado.");
      }

      if (connection === "close") {
        const codigo = lastDisconnect?.error?.output?.statusCode;

        console.log(
          `[WhatsApp][${INSTANCE_ID}] Socket #${tentativaId} fechou. Código: ${
            codigo ?? "desconhecido"
          }. Motivo: ${
            lastDisconnect?.error?.message ?? "não informado"
          }`
        );

        socket = undefined;
        connecting = false;

        if (desconectando || codigo === DisconnectReason.loggedOut) {
          statusWhatsApp = "logged_out";
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
    if (!novoSocket || socket === novoSocket) {
      socket = undefined;
      connecting = false;
      statusWhatsApp = "error";
    }

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

app.get("/internal/qr", autenticarQr, (_req, res) => {
  if (!qrCodeDataUrl) {
    return res.status(404).json({
      error: "QR Code ainda não disponível.",
    });
  }

  return res.json({
    qrCode: qrCodeDataUrl,
    status: statusWhatsApp,
  });
});

app.post("/internal/test-message", autenticar, async (_req, res) => {
  if (statusWhatsApp !== "connected" || !socket) {
    return res.status(503).json({
      status: "disconnected",
      error: "WhatsApp desconectado.",
    });
  }

  try {
    const contatos = await socket.onWhatsApp(STORE_NUMBER);
    const destinatario = contatos?.find((contato) => contato.exists);

    console.log("[diagnóstico] Destinatário:", {
    existe: destinatario?.exists,
    jid: destinatario?.jid,
  });

    if (!destinatario) {
      return res.status(404).json({
        status: "recipient_not_found",
        error: "Número destinatário não encontrado no WhatsApp.",
      });
    }

    const resultado = await socket.sendMessage(destinatario.jid, {
      text: "AGAPE STREETWEAR — Teste de conexão e envio de notificações realizado com sucesso.",
    });

    return res.json({
      status: "sent",
      messageId: resultado?.key?.id || null,
    });
  } catch (erro) {
    console.error("Falha no teste de envio:", erro.message);

    return res.status(502).json({
      status: "error",
      error: "Não foi possível concluir o teste de envio.",
    });
  }
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
    const contatos = await socket.onWhatsApp(STORE_NUMBER);
    const destinatario = contatos?.find((contato) => contato.exists);

    if (!destinatario?.jid) {
      throw new Error("Destinatário não encontrado no WhatsApp.");
    }

    envioIniciado = true;

    const resultado = await socket.sendMessage(destinatario.jid, {
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

app.post("/internal/logout", autenticar, async (_req, res) => {
  if (desconectando) {
    return res.status(409).json({
      error: "Desconexão já em andamento.",
    });
  }

  if (connecting && !socket) {
    return res.status(409).json({
      error: "Aguarde a conexão atual terminar.",
    });
  }

  desconectando = true;
  clearTimeout(reconnectTimer);

  const socketAtual = socket;
  socket = undefined;
  connecting = false;
  qrCodeDataUrl = null;

  try {
    if (socketAtual) {
      try {
        await socketAtual.logout();
      } catch {
        console.log("Socket encerrado durante a desconexão.");
      }
    }

    await limparEstadoAutenticacao();

    statusWhatsApp = "disconnected";
    desconectando = false;

    conectarWhatsApp().catch(() => {
      statusWhatsApp = "error";
      connecting = false;
    });

    return res.status(202).json({
      status: "new_qr_starting",
    });
  } catch {
    desconectando = false;
    statusWhatsApp = "error";

    return res.status(502).json({
      error: "Não foi possível limpar a sessão do WhatsApp.",
    });
  }
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serviço iniciado na porta ${PORT}`);

  conectarWhatsApp();

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
