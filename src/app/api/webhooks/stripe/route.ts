import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Configuração do webhook ausente." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Assinatura inválida:", error);

    return NextResponse.json(
      { error: "Assinatura inválida." },
      { status: 400 }
    );
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      if (
        event.type !== "payment_intent.succeeded" &&
        event.type !== "payment_intent.payment_failed" &&
        event.type !== "payment_intent.canceled"
      ) {
        await tx.stripeEvent.create({
          data: {
            stripeEventId: event.id,
            type: event.type,
          },
        });

        return "ignored";
      }

      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      // Primeiro tenta localizar pelo ID já salvo no pedido.
      let order = await tx.order.findUnique({
        where: {
          paymentIntentID: paymentIntent.id,
        },
      });

      // Se o ID ainda não foi salvo, utiliza o orderId dos metadados.
      if (!order && paymentIntent.metadata.orderId) {
        order = await tx.order.findUnique({
          where: {
            id: paymentIntent.metadata.orderId,
          },
        });
      }

      if (!order) {
        console.error(
          "Pedido não encontrado para PaymentIntent:",
          paymentIntent.id
        );

        // O rollback permite que a Stripe tente entregar novamente.
        throw new Error("Pedido não encontrado para o PaymentIntent.");
      }

      // Impede que um PaymentIntent diferente seja associado ao pedido.
      if (
        order.paymentIntentID &&
        order.paymentIntentID !== paymentIntent.id
      ) {
        console.error(
          "PaymentIntent não corresponde ao pedido:",
          order.id
        );

        throw new Error("PaymentIntent não corresponde ao pedido.");
      }

      // Confirma que o pedido corresponde aos metadados da cobrança.
      if (
        paymentIntent.metadata.orderId &&
        paymentIntent.metadata.orderId !== order.id
      ) {
        throw new Error("Metadados do PaymentIntent não correspondem ao pedido.");
      }

      if (paymentIntent.metadata.userId) {
        const usuarioDoPedido = await tx.user.findUnique({
          where: { id: order.userId },
          select: { externalId: true },
        });

        if (
          !usuarioDoPedido ||
          usuarioDoPedido.externalId !== paymentIntent.metadata.userId
        ) {
          throw new Error("Usuário do PaymentIntent não corresponde ao pedido.");
        }
      }

      // Confere se a chave de checkout corresponde ao pedido.
      if (
        paymentIntent.metadata.checkoutKey &&
        paymentIntent.metadata.checkoutKey !== order.checkoutKey
      ) {
        throw new Error("Chave de checkout do PaymentIntent não corresponde ao pedido.");
      }

      // Registra o evento dentro da mesma transação.
      await tx.stripeEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
        },
      });

      // Recupera o vínculo caso o webhook chegue antes da atualização
      // do pedido pela API de checkout.
      if (!order.paymentIntentID) {
        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            paymentIntentID: paymentIntent.id,
          },
        });
      }

      if (event.type === "payment_intent.succeeded") {
        const valorEsperado = Math.round(order.amount * 100);

        const pagamentoValido =
          paymentIntent.status === "succeeded" &&
          paymentIntent.currency.toLowerCase() ===
            order.currency.toLowerCase() &&
          paymentIntent.amount === valorEsperado &&
          paymentIntent.amount_received === valorEsperado;

        if (!pagamentoValido) {
          console.error(
            "Divergência financeira no pedido:",
            order.id,
            {
              valorEsperado,
              valorStripe: paymentIntent.amount,
              valorRecebido: paymentIntent.amount_received,
              moedaPedido: order.currency,
              moedaStripe: paymentIntent.currency,
            }
          );

          await tx.order.updateMany({
            where: {
              id: order.id,
              status: { not: "paid" },
            },
            data: {
              status: "review_required",
            },
          });

          return "amount_mismatch";
        }

        await tx.order.updateMany({
          where: {
            id: order.id,
            status: { not: "paid" },
          },
          data: {
            status: "paid",
          },
        });

        return "paid";
      }

      if (event.type === "payment_intent.payment_failed") {
        await tx.order.updateMany({
          where: {
            id: order.id,
            status: "pending",
          },
          data: {
            status: "failed",
          },
        });

        return "failed";
      }

      if (event.type === "payment_intent.canceled") {
        await tx.order.updateMany({
          where: {
            id: order.id,
            status: {
              in: ["pending", "failed"],
            },
          },
          data: {
            status: "canceled",
          },
        });

        return "canceled";
      }

      return "ignored";
    });

    if (resultado === "amount_mismatch") {
      return NextResponse.json({
        received: true,
        warning: resultado,
      });
    }

    return NextResponse.json({
      received: true,
      result: resultado,
    });
  } catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = error.meta?.target;

    const duplicidadeDeEvento =
      Array.isArray(target)
        ? target.includes("stripeEventId")
        : typeof target === "string" &&
          target.includes("stripeEventId");

    if (duplicidadeDeEvento) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }
  }

    console.error("Erro ao processar webhook:", error);

    return NextResponse.json(
      { error: "Erro ao processar evento." },
      { status: 500 }
    );
  }
}
