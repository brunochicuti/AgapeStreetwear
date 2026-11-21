
const API_URL = process.env.WHATSAPP_NOTIFICATION_API_URL;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

if (!API_URL || !SERVICE_SECRET) {
  throw new Error("Configuração da API de notificações ausente.");
}

const BASE_URL = API_URL.replace(/\/+$/, "");

async function requisicao(dados) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SERVICE_SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(dados),
    signal: AbortSignal.timeout(15000),
  });

  const resultado = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      resultado.error || `Erro HTTP ${response.status} na API.`
    );
  }

  return resultado;
}

export async function listarNotificacoesPendentes() {
  const resultado = await requisicao({
    action: "list",
  });

  return Array.isArray(resultado.notifications)
    ? resultado.notifications
    : [];
}

export async function buscarNotificacao(notificationId) {
  const resultado = await requisicao({
    action: "get",
    notificationId,
  });

  return resultado.notification;
}

export async function reivindicarNotificacao(notificationId) {
  const resultado = await requisicao({
    action: "claim",
    notificationId,
  });

  return resultado.claimed;
}

export async function marcarComoEnviada(notificationId, messageId) {
  const resultado = await requisicao({
    action: "sent",
    notificationId,
    messageId: messageId || null,
  });

  return { changes: resultado.updated ? 1 : 0 };
}

export async function marcarComoFalha(notificationId, erro) {
  const resultado = await requisicao({
    action: "failed",
    notificationId,
    error: String(erro || "Erro desconhecido").slice(0, 500),
  });

  return { changes: resultado.updated ? 1 : 0 };
}

export async function marcarComoIncerta(notificationId, erro) {
  const resultado = await requisicao({
    action: "unknown",
    notificationId,
    error: String(erro || "Resultado do envio incerto").slice(0, 500),
  });

  return { changes: resultado.updated ? 1 : 0 };
}

export async function recuperarProcessamentosInterrompidos() {
  const resultado = await requisicao({
    action: "recover",
  });

  return resultado.count;
}

export function fecharBanco() {
  // Não existe conexão local para fechar.
}
