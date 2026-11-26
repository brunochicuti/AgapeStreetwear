
import { createHash, randomBytes } from "node:crypto";
import prisma from "@/src/lib/prisma";

export async function gerarTokenRecuperacaoPagamento(
  orderId: string
) {
  const token = randomBytes(32).toString("base64url");

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const resultado = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: { in: ["pending", "failed"] },
      paymentReminderSentAt: null,
    },
    data: {
      paymentRecoveryTokenHash: tokenHash,
      paymentRecoveryExpiresAt: null,
    },
  });

  if (resultado.count !== 1) {
    throw new Error(
      "Não foi possível gerar o link de recuperação."
    );
  }

  return { token, tokenHash };
}
