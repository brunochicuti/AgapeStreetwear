
import prisma from "@/src/lib/prisma";
import { enviarEmail } from "@/src/lib/email";
import { obterTokenAcompanhamento } from "@/src/lib/tracking";

export type EventoEmail =
  | "order_created"
  | "payment_approved"
  | "order_shipped"
  | "order_delivered";

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
  link: string
) {
  const mensagens: Record<EventoEmail, { assunto: string; titulo: string; texto: string }> = {
    order_created: {
      assunto: "Recebemos seu pedido | Agape Streetwear",
      titulo: "Pedido recebido!",
      texto: "Seu pedido foi registrado e está aguardando a confirmação do pagamento.",
    },
    payment_approved: {
      assunto: "Pagamento confirmado | Agape Streetwear",
      titulo: "Pagamento confirmado!",
      texto: "Seu pagamento foi aprovado. Estamos dando andamento ao seu pedido.",
    },
    order_shipped: {
      assunto: "Seu pedido foi enviado | Agape Streetwear",
      titulo: "Pedido enviado!",
      texto: "Seu pedido foi enviado. Acompanhe o andamento pelo link abaixo.",
    },
    order_delivered: {
      assunto: "Pedido entregue | Agape Streetwear",
      titulo: "Pedido entregue!",
      texto: "Seu pedido consta como entregue. Esperamos que tenha uma ótima experiência!",
    },
  };

  const mensagem = mensagens[evento];

  return {
    assunto: mensagem.assunto,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; padding: 30px 20px;">
        <h1 style="color: #b91c1c; font-size: 24px;">Agape Streetwear</h1>

        <h2>${mensagem.titulo}</h2>

        <p>Olá, ${escaparHtml(nome)}!</p>

        <p>${mensagem.texto}</p>

        <p><strong>Valor do pedido:</strong> ${valor}</p>

        <p style="margin: 30px 0;">
          <a href="${link}" style="background: #b91c1c; color: #fff; padding: 14px 22px; text-decoration: none; border-radius: 5px;">
            Acompanhar pedido
          </a>
        </p>

        <p style="font-size: 13px; color: #777;">
          Se tiver dúvidas, entre em contato com nossa equipe.
        </p>

        <p style="font-size: 13px; color: #777;">
          Agape Streetwear
        </p>
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
      },
    });

    if (!pedido?.email) {
      throw new Error("Pedido sem endereço de e-mail válido.");
    }

    const token = await obterTokenAcompanhamento(orderId);

    const siteUrl = (
      process.env.SITE_URL || "https://agapestreetwear.com.br"
    ).replace(/\/+$/, "");

    const link = `${siteUrl}/acompanhar-pedido?token=${encodeURIComponent(token)}`;

    const valor = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(pedido.amount);

    const mensagem = montarEmail(
      evento,
      pedido.fullName || "cliente",
      valor,
      link
    );

    await enviarEmail({
      para: pedido.email,
      assunto: mensagem.assunto,
      html: mensagem.html,
    });

    await prisma.emailNotification.update({
      where: { id: notificacao.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        lastError: null,
      },
    });
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