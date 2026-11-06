
import { auth } from "@clerk/nextjs/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get("payment_intent_id");

    if (!paymentIntentId) {
      return Response.json(
        { error: "Identificação do pagamento ausente." },
        { status: 400 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { externalId: userId },
    });

    if (!user) {
      return Response.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        paymentIntentID: paymentIntentId,
        userId: user.id,
      },
      include: {
        products: true,
      },
    });

    if (!order) {
      return Response.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

    // Confere se os metadados da Stripe correspondem ao pedido.
    if (
      paymentIntent.metadata.orderId &&
      paymentIntent.metadata.orderId !== order.id
    ) {
      console.error(
        "Pedido divergente nos metadados do pagamento:",
        order.id
      );

      return Response.json(
        { error: "Não foi possível validar o pagamento." },
        { status: 409 }
      );
    }

    if (
      paymentIntent.metadata.userId &&
      paymentIntent.metadata.userId !== userId
    ) {
      return Response.json(
        { error: "Não foi possível validar o pagamento." },
        { status: 403 }
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
      console.error("Divergência financeira na confirmação:", {
        orderId: order.id,
        valorEsperado,
        valorStripe: paymentIntent.amount,
        valorRecebido: paymentIntent.amount_received,
        moedaPedido: order.currency,
        moedaStripe: paymentIntent.currency,
      });

      return Response.json(
        { error: "O pagamento precisa de verificação." },
        { status: 409 }
      );
    }

    let statusPedido = order.status;

    // Só atualiza para pago depois de validar todos os dados.
    if (pagamentoValido && order.status !== "paid") {
      await prisma.order.updateMany({
        where: {
          id: order.id,
          status: { not: "paid" },
        },
        data: {
          status: "paid",
        },
      });

      statusPedido = "paid";
    }

    return Response.json({
      order: {
        id: order.id,
        status: statusPedido,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        amount: order.amount,
        currency: order.currency,
        products: order.products,
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

    return Response.json(
      { error: "Não foi possível consultar o pedido." },
      { status: 500 }
    );
  }
}
