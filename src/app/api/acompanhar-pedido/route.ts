
import { createHash } from "node:crypto";
import { connection, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

function respostaJson(
  dados: unknown,
  opcoes: ResponseInit = {}
) {
  return NextResponse.json(dados, {
    ...opcoes,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function gerarHashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
        { error: "Link de acompanhamento invÃ¡lido ou expirado." },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const tokenHash = gerarHashToken(token);

    const pedido = await prisma.order.findUnique({
      where: {
        trackingTokenHash: tokenHash,
      },
      select: {
        id: true,
        status: true,
        subtotal: true,
        shippingCost: true,
        amount: true,
        currency: true,
        createdDate: true,
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
            image: true,
          },
        },
      },
    });

    if (!pedido) {
      return respostaJson(
        { error: "Link de acompanhamento invÃ¡lido ou expirado." },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return respostaJson(
      {
        order: {
          id: pedido.id,
          status: pedido.status,
          subtotal: pedido.subtotal,
          shippingCost: pedido.shippingCost,
          amount: pedido.amount,
          currency: pedido.currency,
          createdDate: pedido.createdDate,
          products: pedido.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
            image: item.image,
          })),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao consultar acompanhamento do pedido:", error);

    return respostaJson(
      { error: "NÃ£o foi possÃ­vel consultar o pedido." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
