import { createHash, createHmac } from "node:crypto";
import prisma from "@/src/lib/prisma";

function gerarDadosTokenAcompanhamento(orderId: string) {
  const secret = process.env.TRACKING_TOKEN_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("TRACKING_TOKEN_SECRET inválida ou não configurada.");
  }

  const token = createHmac("sha256", secret)
    .update(`agape-order-tracking:${orderId}`)
    .digest("base64url");

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  return { token, tokenHash };
}

export async function obterTokenAcompanhamento(orderId: string) {
  const { token, tokenHash } = gerarDadosTokenAcompanhamento(orderId);

  await prisma.order.updateMany({
    where: {
      id: orderId,
      trackingTokenHash: null,
    },
    data: {
      trackingTokenHash: tokenHash,
      trackingTokenCreatedAt: new Date(),
    },
  });

  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    select: { trackingTokenHash: true },
  });

  if (!pedido || pedido.trackingTokenHash !== tokenHash) {
    throw new Error("Não foi possível gerar o link de acompanhamento.");
  }

  return token;
}