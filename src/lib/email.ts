import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type EnviarEmailParams = {
  para: string;
  assunto: string;
  html: string;
};

export async function enviarEmail({
  para,
  assunto,
  html,
}: EnviarEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY nao configurada.");
  }

  const { data, error } = await resend.emails.send({
    from: "Agape Streetwear <contato@agapestreetwear.com.br>",
    to: para,
    replyTo: "suporte@in.agapestreetwear.com.br",
    subject: assunto,
    html,
  });
  
  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }

  return data;
}