import prisma from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import Stripe from "stripe";

type ClerkUserData = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: {
    id: string;
    email_address: string;
  }[];
  primary_email_address_id?: string | null;
  [key: string]: unknown;
};

type ClerkWebhookEvent = {
  type: string;
  data: ClerkUserData;
};

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET não configurado.");
    return NextResponse.json(
      { error: "Configuração do webhook indisponível." },
      { status: 500 }
    );
  }

  // Lê o corpo original, necessário para validar a assinatura.
  const rawBody = await request.text();

  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  if (
    !svixHeaders["svix-id"] ||
    !svixHeaders["svix-timestamp"] ||
    !svixHeaders["svix-signature"]
  ) {
    return NextResponse.json(
      { error: "Cabeçalhos de assinatura ausentes." },
      { status: 400 }
    );
  }

  let event: ClerkWebhookEvent;

  try {
    const webhook = new Webhook(webhookSecret);

webhook.verify(rawBody, svixHeaders);

// A assinatura foi validada. Agora interpretamos o JSON original.
event = JSON.parse(rawBody) as ClerkWebhookEvent;
  } catch (error) {
    console.error("Falha na validação do webhook Clerk:", error);

    return NextResponse.json(
      { error: "Assinatura inválida." },
      { status: 400 }
    );
  }

  // Só precisamos processar eventos de criação e atualização.
  if (
    event.type !== "user.created" &&
    event.type !== "user.updated"
  ) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const {
    id,
    first_name,
    last_name,
    email_addresses,
    primary_email_address_id,
    ...attributes
  } = event.data;

  if (!id) {
    return NextResponse.json(
      { error: "Identificador do usuário ausente." },
      { status: 400 }
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.error("STRIPE_SECRET_KEY não configurado.");

    return NextResponse.json(
      { error: "Configuração de pagamento indisponível." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-09-30.endive",
  });

  try {
    const email =
      email_addresses?.find(
        (item) => item.id === primary_email_address_id
      )?.email_address ??
      email_addresses?.[0]?.email_address;

    const name = [first_name, last_name]
      .filter(Boolean)
      .join(" ");

    const existingUser = await prisma.user.findUnique({
      where: { externalId: id },
    });

    let stripeCustomerId = existingUser?.stripeCustomerId;

    // Cria um cliente Stripe apenas se ainda não existir um vínculo.
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create(
        {
          metadata: {
            clerkUserId: id,
          },
        },
        {
          idempotencyKey: `clerk-user-${id}`,
        }
      );

      stripeCustomerId = customer.id;
    }

    // Atualiza os dados do cliente sem criar outro registro.
    const customerUpdate: Stripe.CustomerUpdateParams = {};

    if (name) {
      customerUpdate.name = name;
    }

    if (email) {
      customerUpdate.email = email;
    }

    if (Object.keys(customerUpdate).length > 0) {
      await stripe.customers.update(
        stripeCustomerId,
        customerUpdate
      );
    }

    await prisma.user.upsert({
      where: {
        externalId: id,
      },
      create: {
        externalId: id,
        stripeCustomerId,
        attributes: attributes as Prisma.InputJsonObject,
      },
      update: {
        stripeCustomerId,
        attributes: attributes as Prisma.InputJsonObject,
      },
    });

    return NextResponse.json(
      { received: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao processar usuário do Clerk:", error);

    // Retorna 500 para permitir que o Clerk tente entregar novamente.
    return NextResponse.json(
      { error: "Falha ao processar usuário." },
      { status: 500 }
    );
  }
}