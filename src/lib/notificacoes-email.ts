
import prisma from "@/src/lib/prisma";
import { enviarEmail } from "@/src/lib/email";
import { obterTokenAcompanhamento } from "@/src/lib/tracking";
import { gerarTokenRecuperacaoPagamento } from "@/src/lib/payment-recovery";
import { stripe } from "@/src/lib/stripe";

export type EventoEmail =
  | "order_created"
  | "payment_approved"
  | "order_shipped"
  | "order_delivered"
  | "payment_reminder";

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function montarEmail(
  evento: EventoEmail,
  nome: string,
  valor: string,
  produtosHtml: string,
  link: string
) {
  const mensagens: Record<EventoEmail,{ assunto: string; preheader: string; titulo: string; texto: string }> = {
    order_created: {
      assunto: "Seu pedido foi recebido | Agape Streetwear",
      titulo: "Obrigado por escolher a Agape!",
      texto:
        "Recebemos seu pedido com sucesso! Agradecemos por comprar na Agape Streetwear. Seu pedido está registrado e aguardando a confirmação do pagamento. Assim que houver uma atualização, avisaremos você por e-mail.",
        preheader: "Recebemos seu pedido! Confira os detalhes da sua compra.",
    },
    payment_approved: {
      assunto: "Pagamento aprovado | Agape Streetwear",
      titulo: "Pagamento confirmado!",
      texto:
        "Seu pagamento foi confirmado com sucesso! Agradecemos pela confiança na Agape Streetwear. Seu pedido tem prazo de até 15 dias úteis para entrega, contados a partir da confirmação do pagamento, incluindo fabricação e transporte. Você poderá acompanhar as atualizações pelo link abaixo.",
        preheader: "Pagamento confirmado! Seu pedido seguirá para preparação.",
    },
    order_shipped: {
      assunto: "Seu pedido está a caminho | Agape Streetwear",
      titulo: "Seu pedido foi enviado!",
      texto:
        "Temos uma ótima notícia: seu pedido já foi encaminhado para entrega! Agradecemos por escolher a Agape Streetwear. Você pode acompanhar o andamento da entrega pelo botão abaixo.",
        preheader: "Seu pedido está a caminho. Acompanhe a entrega!",
    },
    order_delivered: {
      assunto: "Seu pedido foi entregue | Agape Streetwear",
      titulo: "Sua experiência Agape chegou!",
      texto:
        "Seu pedido consta como entregue! Esperamos que você aproveite sua compra e que sua experiência com a Agape Streetwear tenha sido especial. Agradecemos pela confiança e esperamos receber você novamente em breve!",
        preheader: "Seu pedido foi entregue. Obrigado por comprar na Agape!",
    },
    payment_reminder: {
      assunto: "Sua compra está quase concluída | Agape Streetwear",
      titulo: "Sua compra está esperando por você!",
      texto:
        "Percebemos que seu pedido ainda está aguardando o pagamento. Seus produtos continuam registrados e você pode retornar ao checkout para concluir sua compra com segurança.",
      preheader: "Finalize seu pedido na Agape Streetwear.",
    },
  };

  const mensagem = mensagens[evento];

  return {
    assunto: mensagem.assunto,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; padding: 30px 20px;">
      <span style="display: none; font-size: 1px; color: #fff; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
        ${escaparHtml(mensagem.preheader)}
      </span>
        <div style="text-align: center; margin-bottom: 25px;">
        <img
            src="https://agapestreetwear.com.br/logo_agape.png"
            alt="Agape Streetwear"
            width="180"
            style="display: inline-block; max-width: 100%; height: auto;"
        />
        </div>

        <h2>${mensagem.titulo}</h2>

        <p>Olá, ${escaparHtml(nome)}!</p>

        <p>${mensagem.texto}</p>

        <p><strong>Valor do pedido:</strong> ${valor}</p>

        <h3 style="margin-top: 24px;">Itens do pedido</h3>
        <div style="border-top: 1px solid #eee; padding-top: 12px;">
          ${produtosHtml}
        </div>

        <p style="margin: 30px 0;">
          <a href="${link}" style="background: #b91c1c; color: #fff; padding: 14px 22px; text-decoration: none; border-radius: 5px;">
            ${evento === "payment_reminder" ? "Concluir minha compra" : "Acompanhar pedido"}
          </a>
        </p>

        <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="font-size: 14px; font-weight: bold; color: #222;">
            Precisa de ajuda?
          </p>

          <p style="font-size: 13px; color: #777;">
            Se tiver dúvidas sobre seu pedido, entre em contato com nossa equipe:
          </p>

          <p style="font-size: 13px; color: #777; margin: 8px 0;">
            E-mail:
            <a href="mailto:suporte@in.agapestreetwear.com.br" style="color: #b91c1c; text-decoration: none;">
              suporte@in.agapestreetwear.com.br
            </a>
          </p>

          <p style="font-size: 13px; color: #777; margin: 8px 0;">
            WhatsApp:
            <a href="https://wa.me/5567981617997" style="color: #b91c1c; text-decoration: none;">
              (67) 98161-7997
            </a>
          </p>

          <p style="font-size: 13px; color: #777; margin-top: 22px;">
            Atenciosamente,<br />
            <strong style="color: #222;">Equipe Agape Streetwear</strong>
          </p>
        </div>
      </div>
    `,
  };
}


export async function processarNotificacaoEmail(
  orderId: string,
  evento: EventoEmail
) {
  let notificacaoId: string | undefined;

  try {
    const notificacao = await prisma.emailNotification.findUnique({
      where: {
        orderId_eventType: {
          orderId,
          eventType: evento,
        },
      },
      select: { id: true },
    });

    if (!notificacao) return;

    notificacaoId = notificacao.id;

    const estadoAtual = await prisma.emailNotification.findUnique({
      where: { id: notificacao.id },
      select: {
        status: true,
        attempts: true,
      },
    });

    if (!estadoAtual || estadoAtual.attempts >= 5) return;

    const reivindicacao = await prisma.emailNotification.updateMany({
      where: {
        id: notificacao.id,
        status: { in: ["pending", "failed"] },
        attempts: { lt: 5 },
      },
      data: {
        status: "processing",
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    if (reivindicacao.count === 0) return;

    const pedido = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        fullName: true,
        email: true,
        amount: true,
        status: true,
        paymentIntentID: true,
        paymentReminderSentAt: true,
        items: {
          select: {
            name: true,
            quantity: true,
            color: true,
            size: true,
          },
        },
      },
    });

    if (!pedido?.email) {
      throw new Error("Pedido sem endereço de e-mail válido.");
    }

    let link: string;
    let tokenHash: string | null = null;

    const siteUrl = (
      process.env.SITE_URL || "https://agapestreetwear.com.br"
    ).replace(/\/+$/, "");

    if (evento === "payment_reminder") {
      const elegivel =
        ["pending", "failed"].includes(pedido.status) &&
        Boolean(pedido.paymentIntentID) &&
        pedido.paymentReminderSentAt === null;

      if (!elegivel) {
        await prisma.emailNotification.update({
          where: { id: notificacao.id },
          data: {
            status: "cancelled",
            lastError: "Pedido não elegível para lembrete de pagamento.",
          },
        });

        return;
      }
      
      const pagamento = await stripe.paymentIntents.retrieve(
  pedido.paymentIntentID!
);

const valorEsperado = Math.round(pedido.amount * 100);

const pagamentoValido =
  pagamento.amount === valorEsperado &&
  pagamento.currency.toLowerCase() === "brl" &&
  pagamento.metadata.orderId === orderId;

if (!pagamentoValido) {
  throw new Error(
    "PaymentIntent não corresponde ao valor ou moeda do pedido."
  );
}

if (
  ["succeeded", "processing", "canceled"].includes(
    pagamento.status
  )
) {
  await prisma.emailNotification.update({
    where: { id: notificacao.id },
    data: {
      status: "cancelled",
      lastError: `Pagamento não elegível para lembrete: ${pagamento.status}.`,
    },
  });

  return;
}

const qrPix = pagamento.next_action?.pix_display_qr_code;

if (pagamento.status === "requires_action") {
  if (!qrPix?.expires_at) {
    await prisma.emailNotification.update({
      where: { id: notificacao.id },
      data: {
        status: "cancelled",
        lastError: "Ação de pagamento pendente sem QR Pix válido.",
      },
    });

    return;
  }

      const expiraEm = qrPix.expires_at * 1000;
      const horarioSeguro = expiraEm - 10 * 60 * 1000;

      if (Date.now() >= horarioSeguro) {
        await prisma.emailNotification.update({
          where: { id: notificacao.id },
          data: {
            status: "cancelled",
            lastError: "QR Pix sem janela segura para envio do lembrete.",
          },
        });

        return;
      }
    }

      const recuperacao = await gerarTokenRecuperacaoPagamento(orderId);

      tokenHash = recuperacao.tokenHash;

      link = `${siteUrl}/checkout?recuperar=${encodeURIComponent(
        recuperacao.token
      )}`;
    } else {
      const token = await obterTokenAcompanhamento(orderId);

      link = `${siteUrl}/acompanhar-pedido?token=${encodeURIComponent(
        token
      )}`;
    }

    const valor = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(pedido.amount);

    const produtosHtml = pedido.items
      .map(
        (item) => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0; font-weight: bold;">${escaparHtml(item.name)}</p>
            ${
              item.color
                ? `<p style="margin: 4px 0 0; font-size: 13px; color: #777;">Cor: ${escaparHtml(item.color)}</p>`
                : ""
            }
            ${
              item.size
                ? `<p style="margin: 4px 0 0; font-size: 13px; color: #777;">Tamanho: ${escaparHtml(item.size)}</p>`
                : ""
            }
            <p style="margin: 4px 0 0; font-size: 13px; color: #777;">Quantidade: ${item.quantity}</p>
          </div>
        `
      )
      .join("");

    const mensagem = montarEmail(
      evento,
      pedido.fullName || "cliente",
      valor,
      produtosHtml,
      link
    );

    await enviarEmail({
      para: pedido.email,
      assunto: mensagem.assunto,
      html: mensagem.html,
    });

    const enviadoEm = new Date();

    if (evento === "payment_reminder" && tokenHash) {
      await prisma.$transaction(async (tx) => {
        const atualizacao = await tx.order.updateMany({
          where: {
            id: orderId,
            status: { in: ["pending", "failed"] },
            paymentReminderSentAt: null,
            paymentRecoveryTokenHash: tokenHash,
          },
          data: {
            paymentReminderSentAt: enviadoEm,
            paymentRecoveryExpiresAt: new Date(
              enviadoEm.getTime() + 24 * 60 * 60 * 1000
            ),
          },
        });

        if (atualizacao.count !== 1) {
          throw new Error(
            "Não foi possível registrar o envio do lembrete."
          );
        }

        await tx.emailNotification.update({
          where: { id: notificacao.id },
          data: {
            status: "sent",
            sentAt: enviadoEm,
            lastError: null,
          },
        });
      });
    } else {
      await prisma.emailNotification.update({
        where: { id: notificacao.id },
        data: {
          status: "sent",
          sentAt: enviadoEm,
          lastError: null,
        },
      });
    }
  } catch (error) {
    console.error("Falha ao processar notificação de e-mail:", error);

    if (notificacaoId) {
      try {
        await prisma.emailNotification.updateMany({
          where: {
            id: notificacaoId,
            status: "processing",
          },
          data: {
            status: "failed",
            lastError:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : "Erro desconhecido ao enviar e-mail.",
          },
        });
      } catch (erroAtualizacao) {
        console.error("Falha ao atualizar notificação:", erroAtualizacao);
      }
    }
  }
}


export async function registrarNotificacaoEmail(
  orderId: string,
  evento: EventoEmail
) {
  try {
    const resultado = await prisma.emailNotification.createMany({
      data: {
        orderId,
        eventType: evento,
        status: "pending",
      },
      skipDuplicates: true,
    });

    if (resultado.count > 0) {
      await processarNotificacaoEmail(orderId, evento);
    }
  } catch (error) {
    console.error("Falha ao registrar notificação de e-mail:", error);
  }
}