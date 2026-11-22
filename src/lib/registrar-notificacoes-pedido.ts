import { Prisma } from "@prisma/client";

export async function registrarNotificacoesPedido(
  tx: Prisma.TransactionClient,
  orderId: string
) {
  await tx.emailNotification.createMany({
    data: {
      orderId,
      eventType: "payment_approved",
      status: "pending",
    },
    skipDuplicates: true,
  });

  await tx.whatsAppNotification.createMany({
    data: {
      orderId,
      eventType: "payment_approved",
      status: "pending",
    },
    skipDuplicates: true,
  });
}
