import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

export const maxDuration = 30;

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


function gerarChaveIdempotencia(
  orderId: string,
  paymentIntentId: string | null,
  paymentMethod: "pix" | "card" | null
) {
  const identificador = createHash("sha256")
    .update(
    `${orderId}:${paymentIntentId ?? "sem-cobranca"}:${paymentMethod ?? "automatic"}`
    )
    .digest("hex");

  return `recovery-${identificador}`;
}


export async function POST(request: Request) {
  let orderId: string | null = null;
  let lockId: string | null = null;

  try {
    const contentLength = request.headers.get("content-length");

    if (contentLength && Number(contentLength) > 2048) {
      return respostaJson(
        { error: "Requisição muito grande." },
        413
      );
    }

    const texto = await request.text();

    if (new TextEncoder().encode(texto).length > 2048) {
      return respostaJson(
        { error: "Requisição muito grande." },
        413
      );
    }

    let body: unknown;

    try {
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
    paymentMethod !== undefined &&
    paymentMethod !== "pix" &&
    paymentMethod !== "card"
    ) {
    return respostaJson(
        { error: "Método de pagamento inválido." },
        400
    );
    }
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

    const agora = new Date();
    const tokenHash = gerarHashToken(token);

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
        checkoutKey: true,
        paymentIntentID: true,
        paymentRecoveryExpiresAt: true,
        paymentReminderSentAt: true,
      },
    });

    if (
      !pedido ||
      !pedido.userId ||
      !pedido.checkoutKey ||
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

    orderId = pedido.id;
    lockId = randomUUID();

    const bloqueio = await prisma.order.updateMany({
      where: {
        id: pedido.id,
        paymentRecoveryTokenHash: tokenHash,
        paymentRecoveryExpiresAt: {
          gt: agora,
        },
        status: {
          in: ["pending", "failed"],
        },
        OR: [
          { paymentRecoveryLockId: null },
          { paymentRecoveryLockExpiresAt: null },
          {
            paymentRecoveryLockExpiresAt: {
              lte: agora,
            },
          },
        ],
      },
      data: {
        paymentRecoveryLockId: lockId,
        paymentRecoveryLockExpiresAt: new Date(
          agora.getTime() + 2 * 60 * 1000
        ),
      },
    });

    if (bloqueio.count !== 1) {
      return respostaJson(
        {
          error:
            "Esta recuperação já está sendo processada. Aguarde um instante.",
        },
        409
      );
    }

    
    const usuario = await prisma.user.findUnique({
      where: { id: pedido.userId },
      select: { externalId: true },
    });

    if (!usuario) {
      return respostaJson(
        { error: "Não foi possível validar o comprador." },
        409
      );
    }

    let pagamentoAnterior = pedido.paymentIntentID
      ? await stripe.paymentIntents.retrieve(
          pedido.paymentIntentID
        )
      : null;

    if (
      pagamentoAnterior &&
      (
        pagamentoAnterior.metadata.orderId !== pedido.id ||
        pagamentoAnterior.metadata.userId !== usuario.externalId ||
        pagamentoAnterior.metadata.checkoutKey !== pedido.checkoutKey ||
        pagamentoAnterior.amount !== Math.round(pedido.amount * 100) ||
        pagamentoAnterior.currency !== pedido.currency.toLowerCase()
      )
    ) {
      return respostaJson(
        { error: "Não foi possível validar a cobrança anterior." },
        409
      );
    }

    if (
      pagamentoAnterior?.status === "succeeded" ||
      pagamentoAnterior?.status === "processing"
    ) {
      return respostaJson(
        { error: "O pagamento já foi realizado ou está em processamento." },
        409
      );
    }

    if (
      pagamentoAnterior &&
      pagamentoAnterior.status !== "canceled"
    ) {
      const expiracaoPix =
        pagamentoAnterior.next_action?.type === "pix_display_qr_code"
          ? pagamentoAnterior.next_action.pix_display_qr_code?.expires_at
          : undefined;

      const pixExpirado =
        expiracaoPix !== undefined &&
        expiracaoPix <= Math.floor(Date.now() / 1000);

        const podeSubstituirPorMetodo =
        paymentMethod !== undefined &&
        pagamentoAnterior.status === "requires_action";

        if (!pixExpirado && !podeSubstituirPorMetodo) {
        return respostaJson(
            { error: "A cobrança anterior ainda pode ser utilizada." },
            409
        );
        }

      try {
        await stripe.paymentIntents.cancel(
          pagamentoAnterior.id
        );
      } catch {
        const verificacao =
          await stripe.paymentIntents.retrieve(
            pagamentoAnterior.id
          );

        if (verificacao.status !== "canceled") {
          return respostaJson(
            { error: "Não foi possível encerrar a cobrança anterior." },
            409
          );
        }
      }
    }

const pagamentoNovo = await stripe.paymentIntents.create(
  {
    amount: Math.round(pedido.amount * 100),
    currency: pedido.currency.toLowerCase(),

    ...(paymentMethod
      ? {
          allowed_payment_method_types: [paymentMethod],
        }
      : {
          automatic_payment_methods: {
            enabled: true,
          },
        }),

    metadata: {
      userId: usuario.externalId,
      orderId: pedido.id,
      checkoutKey: pedido.checkoutKey,
    },
  },
  {
    idempotencyKey: gerarChaveIdempotencia(
      pedido.id,
      pedido.paymentIntentID,
      paymentMethod ?? null
    ),
  }
);

    if (!pagamentoNovo.client_secret) {
      throw new Error(
        "A nova cobrança não retornou client_secret."
      );
    }

    const atualizado = await prisma.order.updateMany({
      where: {
        id: pedido.id,
        paymentRecoveryLockId: lockId,
        paymentRecoveryTokenHash: tokenHash,
        paymentRecoveryExpiresAt: {
          gt: new Date(),
        },
        status: {
          in: ["pending", "failed"],
        },
      },
        data: {
        paymentIntentID: pagamentoNovo.id,
        paymentMethod: paymentMethod ?? null,
        paymentRecoveryLockId: null,
        paymentRecoveryLockExpiresAt: null,
        },
    });

    if (atualizado.count !== 1) {
      throw new Error(
        "Não foi possível vincular a nova cobrança ao pedido."
      );
    }

    return respostaJson({
    status: "recoverable",
    paymentIntentId: pagamentoNovo.id,
    clientSecret: pagamentoNovo.client_secret,
    paymentMethod: paymentMethod ?? null,
    });

  } catch (error) {
    console.error(
      "Erro ao preparar recuperação do pagamento:",
      error
    );

    return respostaJson(
      { error: "Não foi possível preparar o pagamento." },
      500
    );
  }
    finally {
    if (orderId && lockId) {
      await prisma.order.updateMany({
        where: {
          id: orderId,
          paymentRecoveryLockId: lockId,
        },
        data: {
          paymentRecoveryLockId: null,
          paymentRecoveryLockExpiresAt: null,
        },
      });
    }
  }
}