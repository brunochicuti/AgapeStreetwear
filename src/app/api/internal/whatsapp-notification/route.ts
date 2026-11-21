
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import prisma from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(request: NextRequest) {
  const secret = process.env.WHATSAPP_SERVICE_SECRET;

  if (!secret || secret.length < 40) {
    return false;
  }

  const recebido = Buffer.from(
    request.headers.get("authorization") || ""
  );
  const esperado = Buffer.from(`Bearer ${secret}`);

  return (
    recebido.length === esperado.length &&
    crypto.timingSafeEqual(recebido, esperado)
  );
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ error: mensagem }, { status });
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) {
    return respostaErro("Não autorizado.", 401);
  }

  try {
    const texto = await request.text();

    if (Buffer.byteLength(texto, "utf8") > 10_000) {
      return respostaErro("Requisição muito grande.", 413);
    }

    const body = JSON.parse(texto);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respostaErro("Dados inválidos.", 400);
    }

    const { action, notificationId } = body;

    if (action === "recover") {
      const limite = new Date(Date.now() - 15 * 60 * 1000);

      const resultado = await prisma.whatsAppNotification.updateMany({
        where: {
          status: "processing",
          updatedAt: { lt: limite },
        },
        data: {
          status: "unknown",
          lastError:
            "Serviço interrompido durante o processamento. Conferência manual necessária.",
        },
      });

      return NextResponse.json({
        status: "recovered",
        count: resultado.count,
      });
    }

        if (action === "list") {
      const notificacoes = await prisma.whatsAppNotification.findMany({
        where: {
          eventType: "payment_approved",
          status: { in: ["pending", "failed"] },
          attempts: { lt: 5 },
          order: {
            status: "paid",
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 10,
        select: {
          id: true,
          order: {
            select: {
              id: true,
              fullName: true,
              amount: true,
              items: {
                select: {
                  name: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        notifications: notificacoes.map((notificacao) => ({
          notificationId: notificacao.id,
          orderId: notificacao.order.id,
          customerName:
            notificacao.order.fullName || "Cliente não informado",
          amount: notificacao.order.amount,
          items: notificacao.order.items,
        })),
      });
    }

    if (
      typeof notificationId !== "string" ||
      notificationId.trim().length < 1 ||
      notificationId.length > 100
    ) {
      return respostaErro("Identificador inválido.", 400);
    }

    if (action === "get") {
      const registro = await prisma.whatsAppNotification.findUnique({
        where: { id: notificationId },
        select: {
          id: true,
          status: true,
          attempts: true,
          sentAt: true,
          lastError: true,
        },
      });

      return NextResponse.json({ notification: registro });
    }

    if (action === "claim") {
      const resultado = await prisma.whatsAppNotification.updateMany({
        where: {
          id: notificationId,
          status: { in: ["pending", "failed"] },
          attempts: { lt: 5 },
        },
        data: {
          status: "processing",
          attempts: { increment: 1 },
          lastError: null,
        },
      });

      const registro = await prisma.whatsAppNotification.findUnique({
        where: { id: notificationId },
        select: {
          id: true,
          status: true,
          attempts: true,
        },
      });

      return NextResponse.json({
        claimed: resultado.count === 1,
        notification: registro,
      });
    }

    if (action === "sent") {
      const resultado = await prisma.whatsAppNotification.updateMany({
        where: {
          id: notificationId,
          status: "processing",
        },
        data: {
          status: "sent",
          sentAt: new Date(),
          lastError: null,
        },
      });

      return NextResponse.json({
        updated: resultado.count === 1,
      });
    }

    if (action === "failed" || action === "unknown") {
      const erro =
        typeof body.error === "string"
          ? body.error.slice(0, 500)
          : "Erro não especificado.";

      const resultado = await prisma.whatsAppNotification.updateMany({
        where: {
          id: notificationId,
          status: "processing",
        },
        data: {
          status: action,
          lastError: erro,
        },
      });

      return NextResponse.json({
        updated: resultado.count === 1,
      });
    }

    return respostaErro("Ação inválida.", 400);
  } catch {
    return respostaErro(
      "Não foi possível processar a notificação.",
      500
    );
  }
}
