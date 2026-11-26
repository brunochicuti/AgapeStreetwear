
import { createHash } from "node:crypto";
import { connection, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";
import { obterTokenAcompanhamento } from "@/src/lib/tracking";

function respostaJson(
  dados: unknown,
  status = 200
) {
  return NextResponse.json(dados, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function gerarHashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function GET(request: Request) {
  await connection();

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (
      !token ||
      token.length !== 43 ||
      !/^[A-Za-z0-9_-]+$/.test(token)
    ) {
      return respostaJson(
        { error: "Link de recuperação inválido ou expirado." },
        404
      );
    }

    const tokenHash = gerarHashToken(token);

    const pedido = await prisma.order.findUnique({
      where: {
        paymentRecoveryTokenHash: tokenHash,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        currency: true,
        subtotal: true,
        shippingCost: true,
        amount: true,
        fullName: true,
        cpf: true,
        email: true,
        phone: true,
        zipCode: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        paymentIntentID: true,
        paymentMethod: true,
        paymentRecoveryExpiresAt: true,
        paymentReminderSentAt: true,
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
            image: true,
            color: true,
            size: true,
          },
        },
      },
    });

    if (
      !pedido ||
      !pedido.paymentReminderSentAt ||
      !pedido.paymentRecoveryExpiresAt ||
      pedido.paymentRecoveryExpiresAt <= new Date() ||
      !["pending", "failed"].includes(pedido.status)
    ) {
      return respostaJson(
        { error: "Link de recuperação inválido ou expirado." },
        404
      );
    }


const pagamento = pedido.paymentIntentID
  ? await stripe.paymentIntents.retrieve(
      pedido.paymentIntentID
    )
  : null;

const usuarioDoPedido = pedido.userId
  ? await prisma.user.findUnique({
      where: {
        id: pedido.userId,
      },
      select: {
        externalId: true,
      },
    })
  : null;

if (!usuarioDoPedido) {
  return respostaJson(
    { error: "Não foi possível validar o comprador deste pedido." },
    400
  );
}

if (
  pagamento &&
  (
    pagamento.metadata.orderId !== pedido.id ||
    usuarioDoPedido.externalId !== pagamento.metadata.userId ||
    pagamento.amount !== Math.round(pedido.amount * 100) ||
    pagamento.currency !== pedido.currency.toLowerCase()
  )
) {
  return respostaJson(
    { error: "Não foi possível validar o pagamento deste pedido." },
    400
  );
}

if (pagamento?.status === "succeeded") {
  return respostaJson({
    status: "already_paid",
    message: "Este pedido já foi pago.",
  });
}

if (pagamento?.status === "processing") {
  return respostaJson({
    status: "processing",
    message: "O pagamento está sendo processado.",
  });
}

const dadosRecuperacao = {
  trackingToken: await obterTokenAcompanhamento(pedido.id),
  buyer: {
    fullName: pedido.fullName ?? "",
    cpf: pedido.cpf ?? "",
    email: pedido.email ?? "",
    phone: pedido.phone ?? "",
    zipCode: pedido.zipCode ?? "",
    street: pedido.street ?? "",
    number: pedido.number ?? "",
    complement: pedido.complement ?? "",
    neighborhood: pedido.neighborhood ?? "",
    city: pedido.city ?? "",
    state: pedido.state ?? "",
  },
  order: {
    id: pedido.id,
    subtotal: pedido.subtotal,
    shippingCost: pedido.shippingCost,
    amount: pedido.amount,
    currency: pedido.currency,
    items: pedido.items,
  },
};

// Cobrança inexistente ou cancelada precisa ser substituída.
if (!pagamento || pagamento.status === "canceled") {
  return respostaJson({
    status: "replacement_required",
    ...dadosRecuperacao,
  });
}

if (
  !["requires_payment_method", "requires_action"].includes(
    pagamento.status
  ) ||
  !pagamento.client_secret
) {
  return respostaJson(
    { error: "Este pagamento não pode ser recuperado por este link." },
    409
  );
}

const expiracaoPix =
  pagamento.next_action?.type === "pix_display_qr_code"
    ? pagamento.next_action.pix_display_qr_code?.expires_at
    : undefined;

if (
  expiracaoPix !== undefined &&
  expiracaoPix <= Math.floor(Date.now() / 1000)
) {
  return respostaJson({
    status: "replacement_required",
    ...dadosRecuperacao,
  });
}

return respostaJson({
  status: "recoverable",
  paymentIntentId: pagamento.id,
  clientSecret: pagamento.client_secret,
  paymentMethod: pedido.paymentMethod,
  ...dadosRecuperacao,
});

  } catch (error) {
    console.error("Erro ao recuperar pagamento:", error);

    return respostaJson(
      { error: "Não foi possível recuperar o pagamento agora." },
      500
    );
  }
}
