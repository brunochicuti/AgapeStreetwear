
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import prisma from "@/src/lib/prisma";
import { verificarAdmin } from "@/src/lib/admin";
import { processarNotificacaoEmail } from "@/src/lib/notificacoes-email";

const transicoesPermitidas: Record<string, string> = {
  paid: "preparing",
  preparing: "ready",
  ready: "shipped",
  shipped: "delivered",
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connection();

  try {
    if (!(await verificarAdmin())) {
      return Response.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const { userId } = await auth();
    const { id } = await context.params;
    const body = await request.json();
    const novoStatus = body.status;

    if (!userId || typeof novoStatus !== "string") {
      return Response.json(
        { error: "Dados inválidos." },
        { status: 400 }
      );
    }

    const pedido = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!pedido) {
      return Response.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (transicoesPermitidas[pedido.status] !== novoStatus) {
      return Response.json(
        { error: "Transição de status não permitida." },
        { status: 400 }
      );
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      const resultado = await tx.order.updateMany({
        where: {
          id,
          status: pedido.status,
        },
        data: {
          status: novoStatus,
        },
      });

      if (resultado.count === 0) {
        return false;
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: pedido.status,
          toStatus: novoStatus,
          source: "admin",
          changedBy: userId,
        },
      });

      if (novoStatus === "shipped" || novoStatus === "delivered") {
        await tx.emailNotification.createMany({
            data: {
            orderId: id,
            eventType:
                novoStatus === "shipped" ? "order_shipped" : "order_delivered",
            status: "pending",
            },
            skipDuplicates: true,
        });
        }

      return true;
    });

    if (!atualizado) {
      return Response.json(
        { error: "O pedido foi alterado por outra operação. Atualize a página." },
        { status: 409 }
      );
    }

    if (novoStatus === "shipped") {
      await processarNotificacaoEmail(id, "order_shipped");
    } else if (novoStatus === "delivered") {
      await processarNotificacaoEmail(id, "order_delivered");
    }

    return Response.json({
      success: true,
      status: novoStatus,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);

    return Response.json(
      { error: "Não foi possível atualizar o pedido." },
      { status: 500 }
    );
  }
}
