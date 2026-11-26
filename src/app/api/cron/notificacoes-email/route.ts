
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import {
  processarNotificacaoEmail,
  type EventoEmail,
} from "@/src/lib/notificacoes-email";
import { stripe } from "@/src/lib/stripe";

export const maxDuration = 60;

const eventosPermitidos: EventoEmail[] = [
  "order_created",
  "payment_approved",
  "order_shipped",
  "order_delivered",
  "payment_reminder",
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
 const agora = new Date();

const limiteOutros = new Date(
  agora.getTime() - 60 * 60 * 1000
);

// Cartão e pedidos sem método selecionado: 60 minutos.
const pedidosOutros = await prisma.order.findMany({
  where: {
    status: { in: ["pending", "failed"] },
    paymentReminderSentAt: null,
    paymentIntentID: { not: null },
    email: { not: "" },
    OR: [
  { paymentMethod: "card" },
  { paymentMethod: null },
],
    createdDate: { lte: limiteOutros },
  },
  select: {
    id: true,
  },
  take: 100,
  orderBy: { createdDate: "asc" },
});

// Pix: consultar o vencimento diretamente na Stripe.
const pedidosPix = await prisma.order.findMany({
  where: {
    status: { in: ["pending", "failed"] },
    paymentReminderSentAt: null,
    paymentIntentID: { not: null },
    email: { not: "" },
    paymentMethod: "pix",
  },
  select: {
    id: true,
    amount: true,
    paymentIntentID: true,
    createdDate: true,
  },
  take: 10,
  orderBy: { createdDate: "asc" },
});

const pedidosPixElegiveis: { id: string }[] = [];

for (const pedido of pedidosPix) {
  try {
    const pagamento = await stripe.paymentIntents.retrieve(
      pedido.paymentIntentID!
    );

    if (
      pagamento.amount !== Math.round(pedido.amount * 100) ||
      pagamento.currency.toLowerCase() !== "brl" ||
      pagamento.metadata.orderId !== pedido.id
    ) {
      continue;
    }

    let horarioLembrete: number;

    if (pagamento.status === "requires_payment_method") {
      horarioLembrete =
        pedido.createdDate.getTime() + 30 * 60 * 1000;
    } else if (
      pagamento.status === "requires_action" &&
      pagamento.next_action?.pix_display_qr_code?.expires_at
    ) {
      const expiraEm =
        pagamento.next_action.pix_display_qr_code.expires_at * 1000;

    horarioLembrete = Math.min(
      pedido.createdDate.getTime() + 30 * 60 * 1000,
      expiraEm - 15 * 60 * 1000
    );

    if (agora.getTime() >= expiraEm - 10 * 60 * 1000) {
      continue;
    }
    } else {
      continue;
    }

    if (agora.getTime() >= horarioLembrete) {
      pedidosPixElegiveis.push({ id: pedido.id });
    }
  } catch (error) {
    console.error(
      "Erro ao verificar pagamento Pix:",
      pedido.id,
      error
    );
  }
}

const pedidosVencidos = [
  ...pedidosOutros,
  ...pedidosPixElegiveis,
];

const lembretesRegistrados =
  await prisma.emailNotification.createMany({
    data: pedidosVencidos.map((pedido) => ({
      orderId: pedido.id,
      eventType: "payment_reminder",
      status: "pending",
    })),
    skipDuplicates: true,
  });

    const limiteParadas = new Date(
      agora.getTime() - 15 * 60 * 1000
    );

    const paradas = await prisma.emailNotification.findMany({
      where: {
        status: "processing",
        updatedAt: { lt: limiteParadas },
        attempts: { lt: 5 },
      },
      select: {
        id: true,
      },
      take: 10,
      orderBy: { updatedAt: "asc" },
    });

    let recuperadas = 0;

    for (const notificacao of paradas) {
      const resultado = await prisma.emailNotification.updateMany({
        where: {
          id: notificacao.id,
          status: "processing",
          updatedAt: { lt: limiteParadas },
          attempts: { lt: 5 },
        },
        data: {
          status: "failed",
          lastError:
            "Processamento interrompido; tentativa de recuperação.",
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
      lembretesEncontrados: pedidosVencidos.length,
      lembretesRegistrados: lembretesRegistrados.count,
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
