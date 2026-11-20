
import { auth } from "@clerk/nextjs/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

function respostaJson(
  dados: unknown,
  opcoes: { status?: number } = {}
) {
  return Response.json(dados, {
    ...opcoes,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get("payment_intent_id");

    if (!paymentIntentId) {
      return respostaJson(
        { error: "IdentificaÃ§Ã£o do pagamento ausente." },
        { status: 400 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return respostaJson(
        { error: "NÃ£o autenticado." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { externalId: userId },
    });

    if (!user) {
      return respostaJson(
        { error: "UsuÃ¡rio nÃ£o encontrado." },
        { status: 404 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        paymentIntentID: paymentIntentId,
        userId: user.id,
      },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    if (!order) {
      return respostaJson(
        { error: "Pedido nÃ£o encontrado." },
        { status: 404 }
      );
    }

    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

// Confere se todos os metadados da Stripe correspondem ao pedido.
    if (
      !paymentIntent.metadata.orderId ||
      paymentIntent.metadata.orderId !== order.id ||
      !paymentIntent.metadata.userId ||
      paymentIntent.metadata.userId !== userId ||
      !paymentIntent.metadata.checkoutKey ||
      !order.checkoutKey ||
      paymentIntent.metadata.checkoutKey !== order.checkoutKey
    ) {
      console.error(
        "Metadados do PaymentIntent ausentes ou divergentes:",
        order.id
      );

      return respostaJson(
        { error: "NÃ£o foi possÃ­vel validar o pagamento." },
        { status: 409 }
      );
    }

    // Confere valor, moeda e recebimento efetivo.
    const valorEsperado = Math.round(order.amount * 100);

    const pagamentoValido =
      paymentIntent.status === "succeeded" &&
      paymentIntent.currency.toLowerCase() ===
        order.currency.toLowerCase() &&
      paymentIntent.amount === valorEsperado &&
      paymentIntent.amount_received === valorEsperado;

    if (paymentIntent.status === "succeeded" && !pagamentoValido) {
      console.error("DivergÃªncia financeira na confirmaÃ§Ã£o:", {
        orderId: order.id,
        valorEsperado,
        valorStripe: paymentIntent.amount,
        valorRecebido: paymentIntent.amount_received,
        moedaPedido: order.currency,
        moedaStripe: paymentIntent.currency,
      });

      return respostaJson(
        { error: "O pagamento precisa de verificaÃ§Ã£o." },
        { status: 409 }
      );
    }

    let statusPedido = order.status;

    // SÃ³ aprova pedidos pendentes ou com tentativa anterior falha.
if (pagamentoValido) {
  const statusFinal = await prisma.$transaction(async (tx) => {
    const pedidoAntes = await tx.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });

    if (!pedidoAntes) {
      return null;
    }

    if (!["pending", "failed"].includes(pedidoAntes.status)) {
      return pedidoAntes.status;
    }

    const pagamentoAtualizado = await tx.order.updateMany({
      where: {
        id: order.id,
        status: pedidoAntes.status,
      },
      data: {
        status: "paid",
      },
    });

    if (pagamentoAtualizado.count > 0) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: pedidoAntes.status,
          toStatus: "paid",
          source: "payment_confirmation",
        },
      });

      return "paid";
    }

    const pedidoAtual = await tx.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });

    return pedidoAtual?.status ?? null;
  });

  if (!statusFinal) {
    throw new Error("Pedido não encontrado após validar o pagamento.");
  }

  statusPedido = statusFinal;

  if (
    statusPedido === "canceled" ||
    statusPedido === "review_required"
  ) {
    console.error(
      "Pagamento confirmado exige revisão manual:",
      order.id,
      "Status atual:",
      statusPedido
    );
  }
}

    return respostaJson({
      order: {
        id: order.id,
        status: statusPedido,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        amount: order.amount,
        currency: order.currency,
        products: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
      },
      paymentStatus: paymentIntent.status,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      error.digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }

    console.error("Erro ao consultar pedido:", error);

    return respostaJson(
      { error: "NÃ£o foi possÃ­vel consultar o pedido." },
      { status: 500 }
    );
  }
}
