
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Configuração do webhook ausente" },
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
      { error: "Assinatura inválida" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await prisma.order.updateMany({
          where: { paymentIntentID: paymentIntent.id },
          data: { status: "paid" },
        });

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await prisma.order.updateMany({
          where: { paymentIntentID: paymentIntent.id },
          data: { status: "failed" },
        });

        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await prisma.order.updateMany({
          where: { paymentIntentID: paymentIntent.id },
          data: { status: "canceled" },
        });

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);

    return NextResponse.json(
      { error: "Erro ao processar evento" },
      { status: 500 }
    );
  }
}
