import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";
import { processarNotificacaoEmail } from "@/src/lib/notificacoes-email";
import { registrarNotificacoesPedido } from "@/src/lib/registrar-notificacoes-pedido";

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
    let pedidoParaNotificar: string | null = null;
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


      // Confere se os metadados essenciais correspondem ao pedido.
      if (
        !paymentIntent.metadata.userId ||
        !paymentIntent.metadata.checkoutKey ||
        !order.checkoutKey ||
        paymentIntent.metadata.checkoutKey !== order.checkoutKey
      ) {
        throw new Error(
          "Metadados essenciais do PaymentIntent ausentes ou divergentes."
        );
      }

      // Se informado, o orderId precisa corresponder ao pedido.
      if (
        paymentIntent.metadata.orderId &&
        paymentIntent.metadata.orderId !== order.id
      ) {
        throw new Error(
          "Metadados do PaymentIntent não correspondem ao pedido."
        );
      }

      // Valida o usuário quando o vínculo ainda existe.
      if (order.userId !== null) {
        const usuarioDoPedido = await tx.user.findUnique({
          where: { id: order.userId },
          select: { externalId: true },
        });

        if (
          !usuarioDoPedido ||
          usuarioDoPedido.externalId !== paymentIntent.metadata.userId
        ) {
          throw new Error(
            "Usuário do PaymentIntent não corresponde ao pedido."
          );
        }
      }

      // Confere se a chave de checkout corresponde ao pedido.
      if (
        paymentIntent.metadata.checkoutKey &&
        paymentIntent.metadata.checkoutKey !== order.checkoutKey
      ) {
        throw new Error("Chave de checkout do PaymentIntent não corresponde ao pedido.");
      }

      // Protege o pedido enquanto uma cobrança está sendo substituída.
const bloqueioRecuperacaoAtivo =
  order.paymentRecoveryLockId !== null &&
  order.paymentRecoveryLockExpiresAt !== null &&
  order.paymentRecoveryLockExpiresAt > new Date();

if (
  bloqueioRecuperacaoAtivo &&
  order.paymentIntentID === paymentIntent.id
) {
  await tx.stripeEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
    },
  });

  // Uma aprovação durante a substituição exige revisão manual.
  if (event.type === "payment_intent.succeeded") {
    if (
      ["pending", "failed", "paid", "canceled"].includes(
        order.status
      )
    ) {
      const revisao = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status,
        },
        data: {
          status: "review_required",
        },
      });

      if (revisao.count > 0) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "review_required",
            source: "stripe_webhook",
          },
        });
      }
    }

    return "recovery_lock_payment_requires_manual_review";
  }

  // Falhas e cancelamentos da cobrança anterior não alteram o pedido.
  return "recovery_lock_old_payment_ignored";
}

      // Trata eventos de cobranças antigas, substituídas por outra tentativa.
if (
  order.paymentIntentID &&
  order.paymentIntentID !== paymentIntent.id
) {
  console.error(
    "Evento recebido de um PaymentIntent antigo:",
    order.id,
    paymentIntent.id,
    event.type
  );

  // Registra o evento para impedir reprocessamento desnecessário.
  await tx.stripeEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
    },
  });

  // Uma cobrança antiga aprovada exige revisão manual.
  if (event.type === "payment_intent.succeeded") {
    if (
      ["pending", "failed", "paid", "canceled"].includes(
        order.status
      )
    ) {
      const revisao = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status,
        },
        data: {
          status: "review_required",
        },
      });

      if (revisao.count > 0) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "review_required",
            source: "stripe_webhook",
          },
        });
      }
    }

    return "stale_payment_requires_manual_review";
  }

  // Cancelamentos e falhas antigas não alteram o pedido atual.
  return "stale_payment_ignored";
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

          const pedidoAntes = await tx.order.findUnique({
            where: { id: order.id },
            select: { status: true },
          });

          if (!pedidoAntes) {
            throw new Error("Pedido não encontrado durante a revisão financeira.");
          }

          if (!["pending", "failed"].includes(pedidoAntes.status)) {
            return pedidoAntes.status === "paid"
              ? "already_paid_amount_mismatch"
              : "amount_mismatch_requires_manual_review";
          }

          const pedidosEmRevisao = await tx.order.updateMany({
            where: {
              id: order.id,
              status: pedidoAntes.status,
            },
            data: {
              status: "review_required",
            },
          });

          if (pedidosEmRevisao.count > 0) {
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus: pedidoAntes.status,
                toStatus: "review_required",
                source: "stripe_webhook",
              },
            });

            return "amount_mismatch";
          }
          return "amount_mismatch_requires_manual_review";
          }

          const pedidoAntes = await tx.order.findUnique({
            where: { id: order.id },
            select: { status: true },
          });

          if (!pedidoAntes) {
            throw new Error("Pedido não encontrado antes da aprovação.");
          }

          const pagamentoAtualizado = ["pending", "failed"].includes(
            pedidoAntes.status
          )
            ? await tx.order.updateMany({
                where: {
                  id: order.id,
                  status: pedidoAntes.status,
                },
                data: {
                  status: "paid",
                  paymentRecoveryTokenHash: null,
                  paymentRecoveryExpiresAt: null,
                },
              })
            : { count: 0 };

          if (pagamentoAtualizado.count > 0) {
            pedidoParaNotificar = order.id;
              await tx.order.updateMany({
              where: {
                id: order.id,
                fulfillmentStatus: "awaiting_payment",
              },
              data: {
                fulfillmentStatus: "pending",
              },
            });

            await registrarNotificacoesPedido(tx, order.id);

            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus: pedidoAntes.status,
                toStatus: "paid",
                source: "stripe_webhook",
              },
            });

            return "paid";
          }

      const pedidoAtual = await tx.order.findUnique({
        where: { id: order.id },
        select: {
          id: true,
          status: true,
        },
      });

        if (!pedidoAtual) {
          throw new Error("Pedido não encontrado após a confirmação do pagamento.");
        }

        if (pedidoAtual.status === "paid") {
          await tx.order.updateMany({
            where: {
              id: pedidoAtual.id,
              fulfillmentStatus: "awaiting_payment",
            },
            data: {
              fulfillmentStatus: "pending",
            },
          });

          return "already_paid";
        }

        if (
          pedidoAtual.status === "canceled" ||
          pedidoAtual.status === "review_required"
        ) {
          console.error(
            "Pagamento aprovado exige revisão manual:",
            order.id,
            "Status atual:",
            pedidoAtual.status
          );

          return "manual_review_required";
        }

        return "status_not_eligible";
      }

      if (event.type === "payment_intent.payment_failed") {
        const pedidoAntes = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });

        if (!pedidoAntes) {
          throw new Error("Pedido não encontrado antes de registrar a falha.");
        }

        if (pedidoAntes.status !== "pending") {
          return "status_not_eligible";
        }

        const pagamentoAtualizado = await tx.order.updateMany({
          where: {
            id: order.id,
            status: "pending",
          },
          data: {
            status: "failed",
          },
        });

        if (pagamentoAtualizado.count > 0) {
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: "pending",
              toStatus: "failed",
              source: "stripe_webhook",
            },
          });

          return "failed";
        }

        return "status_not_eligible";
      }

      if (event.type === "payment_intent.canceled") {
        const pedidoAntes = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });

        if (!pedidoAntes) {
          throw new Error("Pedido não encontrado antes do cancelamento.");
        }

        if (!["pending", "failed"].includes(pedidoAntes.status)) {
          return "status_not_eligible";
        }

        const pagamentoAtualizado = await tx.order.updateMany({
          where: {
            id: order.id,
            status: pedidoAntes.status,
          },
          data: {
            status: "canceled",
            paymentRecoveryTokenHash: null,
            paymentRecoveryExpiresAt: null,
          },
        });

        if (pagamentoAtualizado.count > 0) {
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: pedidoAntes.status,
              toStatus: "canceled",
              source: "stripe_webhook",
            },
          });

          return "canceled";
        }

        return "status_not_eligible";
      }

      return "ignored";
    });

    if (pedidoParaNotificar) {
    await processarNotificacaoEmail(
      pedidoParaNotificar,
      "payment_approved"
    );
  }

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
