
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import {
  processarNotificacaoEmail,
  type EventoEmail,
} from "@/src/lib/notificacoes-email";

export const maxDuration = 60;

const eventosPermitidos: EventoEmail[] = [
  "order_created",
  "payment_approved",
  "order_shipped",
  "order_delivered",
];

function autorizarCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization) return false;

  const esperado = Buffer.from(`Bearer ${secret}`);
  const recebido = Buffer.from(authorization);

  return (
    esperado.length === recebido.length &&
    timingSafeEqual(esperado, recebido)
  );
}

export async function GET(request: Request) {
  if (!autorizarCron(request)) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401 }
    );
  }

  try {
    const limite = new Date(Date.now() - 15 * 60 * 1000);

    const paradas = await prisma.emailNotification.findMany({
      where: {
        status: "processing",
        updatedAt: { lt: limite },
        attempts: { lt: 5 },
      },
      select: {
        id: true,
      },
      take: 50,
      orderBy: { updatedAt: "asc" },
    });

    let recuperadas = 0;

    for (const notificacao of paradas) {
      const resultado = await prisma.emailNotification.updateMany({
        where: {
          id: notificacao.id,
          status: "processing",
          updatedAt: { lt: limite },
          attempts: { lt: 5 },
        },
        data: {
          status: "failed",
          lastError: "Processamento interrompido; tentativa de recuperação.",
        },
      });

      if (resultado.count > 0) recuperadas++;
    }

    const pendentes = await prisma.emailNotification.findMany({
      where: {
        status: { in: ["pending", "failed"] },
        attempts: { lt: 5 },
        eventType: { in: eventosPermitidos },
      },
      select: {
        orderId: true,
        eventType: true,
      },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    let processadas = 0;

    for (const notificacao of pendentes) {
      await processarNotificacaoEmail(
        notificacao.orderId,
        notificacao.eventType as EventoEmail
      );

      processadas++;
    }

    return NextResponse.json({
      success: true,
      recuperadas,
      processadas,
    });
  } catch (error) {
    console.error("Erro na rotina de notificações:", error);

    return NextResponse.json(
      { error: "Falha ao processar notificações." },
      { status: 500 }
    );
  }
}
