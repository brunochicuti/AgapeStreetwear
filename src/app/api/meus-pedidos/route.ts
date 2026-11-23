
import { auth } from "@clerk/nextjs/server";
import prisma from "@/src/lib/prisma";
import { connection } from "next/server";

export async function GET() {
    await connection();

  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Faça login para consultar seus pedidos." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { externalId: userId },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ orders: [] });
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdDate: "desc" },
      select: {
        id: true,
        fulfillmentStatus: true,
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
        statusHistory: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
        },
      },
    });

    return Response.json(
      {
        orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        amount: order.amount,
        currency: order.currency,
        createdDate: order.createdDate,
        statusHistory: order.statusHistory.map((history) => ({
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          createdAt: history.createdAt,
        })),
        products: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
            image: item.image,
        })),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao consultar pedidos do usuário:", error);

    return Response.json(
      { error: "Não foi possível consultar seus pedidos." },
      { status: 500 }
    );
  }
}
