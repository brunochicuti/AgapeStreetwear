
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

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

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");

    if (contentLength && Number(contentLength) > 2048) {
      return respostaJson(
        { error: "Requisição muito grande." },
        413
      );
    }

    let body: unknown;

    try {
      const texto = await request.text();

      if (new TextEncoder().encode(texto).length > 2048) {
        return respostaJson(
          { error: "Requisição muito grande." },
          413
        );
      }

      body = JSON.parse(texto);
    } catch {
      return respostaJson(
        { error: "Requisição inválida." },
        400
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return respostaJson(
        { error: "Dados inválidos." },
        400
      );
    }

    const dados = body as Record<string, unknown>;
    const token = dados.token;
    const paymentMethod = dados.paymentMethod;

    if (
      typeof token !== "string" ||
      token.length !== 43 ||
      !/^[A-Za-z0-9_-]+$/.test(token)
    ) {
      return respostaJson(
        { error: "Link de recuperação inválido ou expirado." },
        404
      );
    }

    if (!["pix", "card"].includes(String(paymentMethod))) {
      return respostaJson(
        { error: "Método de pagamento inválido." },
        400
      );
    }

    const tokenHash = gerarHashToken(token);
    const agora = new Date();

    const pedido = await prisma.order.findUnique({
      where: {
        paymentRecoveryTokenHash: tokenHash,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        amount: true,
        currency: true,
        paymentIntentID: true,
        paymentMethod: true,
        paymentReminderSentAt: true,
        paymentRecoveryExpiresAt: true,
      },
    });

    if (
      !pedido ||
      !pedido.userId ||
      !pedido.paymentIntentID ||
      !pedido.paymentReminderSentAt ||
      !pedido.paymentRecoveryExpiresAt ||
      pedido.paymentRecoveryExpiresAt <= agora ||
      !["pending", "failed"].includes(pedido.status)
    ) {
      return respostaJson(
        { error: "Link de recuperação inválido ou expirado." },
        404
      );
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: pedido.userId,
      },
      select: {
        externalId: true,
      },
    });

    if (!usuario) {
      return respostaJson(
        { error: "Não foi possível validar o pedido." },
        409
      );
    }

    const pagamento = await stripe.paymentIntents.retrieve(
      pedido.paymentIntentID
    );

    if (
      pagamento.metadata.orderId !== pedido.id ||
      pagamento.metadata.userId !== usuario.externalId ||
      pagamento.amount !== Math.round(pedido.amount * 100) ||
      pagamento.currency !== pedido.currency.toLowerCase()
    ) {
      return respostaJson(
        { error: "Não foi possível validar o pagamento." },
        409
      );
    }

    if (pagamento.status === "succeeded") {
      return respostaJson(
        { error: "Este pedido já foi pago." },
        409
      );
    }

    if (
      pagamento.status === "processing" ||
      pagamento.status === "canceled"
    ) {
      return respostaJson(
        { error: "Este pagamento não pode ser alterado." },
        409
      );
    }

    if (
      !["requires_payment_method", "requires_action"].includes(
        pagamento.status
      )
    ) {
      return respostaJson(
        { error: "Este pagamento não pode ser alterado." },
        409
      );
    }

    // Quando a Stripe já iniciou uma ação de pagamento,
    // só permitimos manter o método anteriormente registrado.
    if (
    pagamento.status === "requires_action" &&
    pedido.paymentMethod !== paymentMethod
    ) {
    return respostaJson({
        success: false,
        replacementRequired: true,
    });
    }

    const atualizado = await prisma.order.updateMany({
      where: {
        id: pedido.id,
        paymentRecoveryTokenHash: tokenHash,
        paymentRecoveryExpiresAt: {
          gt: new Date(),
        },
        paymentReminderSentAt: {
          not: null,
        },
        paymentIntentID: pagamento.id,
        status: {
          in: ["pending", "failed"],
        },
      },
      data: {
        paymentMethod: paymentMethod as string,
      },
    });

    if (atualizado.count !== 1) {
      return respostaJson(
        { error: "Não foi possível atualizar o método de pagamento." },
        409
      );
    }

    return respostaJson({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro ao registrar método de recuperação:",
      error
    );

    return respostaJson(
      { error: "Não foi possível registrar o método de pagamento." },
      500
    );
  }
}
