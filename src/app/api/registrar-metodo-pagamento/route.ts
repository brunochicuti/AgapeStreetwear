
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

function erroJson(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    // Confirma a autenticação do cliente.
    const { userId } = await auth();

    if (!userId) {
      return erroJson("Não autenticado.", 401);
    }

    // Limita o tamanho da requisição.
    const contentLength = request.headers.get("content-length");

    if (contentLength && Number(contentLength) > 2048) {
      return erroJson("Requisição muito grande.", 413);
    }

    let body: unknown;

    try {
      const texto = await request.text();

      if (new TextEncoder().encode(texto).length > 2048) {
        return erroJson("Requisição muito grande.", 413);
      }

      body = JSON.parse(texto);
    } catch {
      return erroJson("Requisição inválida.", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return erroJson("Dados inválidos.", 400);
    }

    const dados = body as Record<string, unknown>;
    const paymentIntentId = dados.paymentIntentId;
    const paymentMethod = dados.paymentMethod;

    if (
      typeof paymentIntentId !== "string" ||
      !/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)
    ) {
      return erroJson("Identificação do pagamento inválida.", 400);
    }

    if (!["pix", "card"].includes(String(paymentMethod))) {
      return erroJson("Método de pagamento inválido.", 400);
    }

    // Localiza a conta interna correspondente ao usuário autenticado.
    const user = await prisma.user.findUnique({
      where: {
        externalId: userId,
      },
      select: {
        id: true,
        deletionRequestedAt: true,
      },
    });

    if (!user || user.deletionRequestedAt) {
      return erroJson("Usuário não autorizado.", 403);
    }

    // Consulta o pagamento diretamente na Stripe.
    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

    if (
      paymentIntent.metadata.userId !== userId ||
      !paymentIntent.metadata.orderId ||
      paymentIntent.status !== "requires_payment_method" ||
      paymentIntent.currency !== "brl"
    ) {
      return erroJson(
        "Não foi possível validar o pagamento.",
        409
      );
    }

    // Confirma que o pagamento pertence ao pedido e ao usuário.
    const order = await prisma.order.findFirst({
      where: {
        id: paymentIntent.metadata.orderId,
        userId: user.id,
        paymentIntentID: paymentIntent.id,
        status: {
          in: ["pending", "failed"],
        },
        paymentReminderSentAt: null,
      },
      select: {
        id: true,
        amount: true,
      },
    });

    if (!order) {
      return erroJson(
        "Pedido não encontrado ou não disponível para atualização.",
        409
      );
    }

    // Confere o valor antes de atualizar o método.
    if (Math.round(order.amount * 100) !== paymentIntent.amount) {
      return erroJson(
        "O valor do pagamento não corresponde ao pedido.",
        409
      );
    }

    const atualizado = await prisma.order.updateMany({
      where: {
        id: order.id,
        userId: user.id,
        paymentIntentID: paymentIntent.id,
        status: {
          in: ["pending", "failed"],
        },
        paymentReminderSentAt: null,
      },
      data: {
        paymentMethod: paymentMethod as string,
      },
    });

    if (atualizado.count !== 1) {
      return erroJson(
        "Não foi possível atualizar o método de pagamento.",
        409
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro ao registrar método de pagamento:",
      error
    );

    return erroJson(
      "Não foi possível registrar o método de pagamento.",
      500
    );
  }
}
