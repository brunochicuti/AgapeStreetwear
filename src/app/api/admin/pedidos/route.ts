
import { connection } from "next/server";
import prisma from "@/src/lib/prisma";
import { verificarAdmin } from "@/src/lib/admin";

export async function GET() {
  await connection();

  try {
    if (!(await verificarAdmin())) {
      return Response.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      orderBy: {
        createdDate: "desc",
      },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        subtotal: true,
        shippingCost: true,
        amount: true,
        currency: true,
        createdDate: true,
        fullName: true,
        email: true,
        phone: true,
        zipCode: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
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
        statusHistory: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            fromStatus: true,
            toStatus: true,
            source: true,
            createdAt: true,
          },
        },
      },
    });

    return Response.json(
      { orders },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao consultar pedidos administrativos:", error);

    return Response.json(
      { error: "Não foi possível consultar os pedidos." },
      { status: 500 }
    );
  }
}
