
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import prisma from "@/src/lib/prisma";
import { verificarAdmin } from "@/src/lib/admin";

const statusPermitidos = [
  "PENDENTE",
  "EM_ANALISE",
  "CONCLUIDA",
  "PARCIAL",
  "INDEFERIDA",
] as const;

const statusFinais = ["CONCLUIDA", "PARCIAL", "INDEFERIDA"];

export async function GET() {
  await connection();

  try {
    if (!(await verificarAdmin())) {
      return Response.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const solicitacoes = await prisma.privacyRequest.findMany({
      orderBy: { receivedAt: "desc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        type: true,
        source: true,
        status: true,
        receivedAt: true,
        completedAt: true,
        decision: true,
        justification: true,
        processedBy: true,
        user: {
          select: {
            deletionRequestedAt: true,
          },
        },
      },
    });

    return Response.json({ solicitacoes });
  } catch (error) {
    console.error("Erro ao consultar solicitações de privacidade:", error);

    return Response.json(
      { error: "Não foi possível consultar as solicitações." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  await connection();

  try {
    if (!(await verificarAdmin())) {
      return Response.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id = body.id;
    const novoStatus = body.status;
    const decisao = body.decision;
    const justificativa = body.justification;

    if (
      typeof id !== "string" ||
      !id.trim() ||
      typeof novoStatus !== "string" ||
      !statusPermitidos.includes(
        novoStatus as (typeof statusPermitidos)[number]
      )
    ) {
      return Response.json(
        { error: "Dados inválidos." },
        { status: 400 }
      );
    }

    if (
      statusFinais.includes(novoStatus) &&
      (
        typeof decisao !== "string" ||
        !decisao.trim() ||
        typeof justificativa !== "string" ||
        !justificativa.trim()
      )
    ) {
      return Response.json(
        {
          error:
            "Informe a decisão e a justificativa para concluir a solicitação.",
        },
        { status: 400 }
      );
    }

    const solicitacao = await prisma.privacyRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!solicitacao) {
      return Response.json(
        { error: "Solicitação não encontrada." },
        { status: 404 }
      );
    }

    const transicoesPermitidas: Record<string, string[]> = {
      PENDENTE: ["EM_ANALISE"],
      EM_ANALISE: ["CONCLUIDA", "PARCIAL", "INDEFERIDA"],
    };

    if (!transicoesPermitidas[solicitacao.status]?.includes(novoStatus)) {
      return Response.json(
        { error: "Transição de status não permitida." },
        { status: 409 }
      );
    }

    const resultado = await prisma.privacyRequest.updateMany({
      where: {
        id,
        status: solicitacao.status,
      },
      data: {
        status: novoStatus,
        decision:
          typeof decisao === "string" ? decisao.trim() : null,
        justification:
          typeof justificativa === "string"
            ? justificativa.trim()
            : null,
        processedBy: userId,
        completedAt: statusFinais.includes(novoStatus)
          ? new Date()
          : null,
      },
    });

    if (resultado.count === 0) {
      return Response.json(
        {
          error:
            "A solicitação foi alterada por outra operação. Atualize a página.",
        },
        { status: 409 }
      );
    }

    return Response.json({
      success: true,
      status: novoStatus,
    });
  } catch (error) {
    console.error("Erro ao atualizar solicitação de privacidade:", error);

    return Response.json(
      { error: "Não foi possível atualizar a solicitação." },
      { status: 500 }
    );
  }
}
