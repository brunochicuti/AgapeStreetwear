
import { ProductType } from "@/src/types/ProductType";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

const calculateOrderAmount = (items: ProductType[]) => {
  return items.reduce((total, item) => {
    return total + item.price! * item.quantity!;
  }, 0);
};

function erroJson(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return erroJson("Não autenticado.", 401);
    }

    const { items, payment_intent_id } = await req.json();

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.some(
        (item: ProductType) =>
          typeof item.price !== "number" ||
          item.price <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity! <= 0
      )
    ) {
      return erroJson("Itens inválidos.", 400);
    }

    const total = calculateOrderAmount(items);

    const user = await prisma.user.findUnique({
      where: { externalId: userId },
    });

    if (!user) {
      return erroJson("Usuário não encontrado.", 404);
    }

    const productData = items.map((item: ProductType) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity!,
      price: item.price!,
      image: item.image,
    }));

    if (payment_intent_id) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          paymentIntentID: payment_intent_id,
          userId: user.id,
        },
      });

      if (!existingOrder) {
        return erroJson("Pedido não encontrado.", 404);
      }

      const currentIntent =
        await stripe.paymentIntents.retrieve(payment_intent_id);

      if (currentIntent.status === "requires_payment_method") {
        const updatedIntent = await stripe.paymentIntents.update(
          payment_intent_id,
          { amount: total }
        );

        await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            amount: total / 100,
            products: {
              deleteMany: {},
              create: productData,
            },
          },
        });

        return Response.json({ paymentIntent: updatedIntent });
      }

      if (
        currentIntent.status !== "succeeded" &&
        currentIntent.status !== "canceled"
      ) {
        return erroJson(
          "O pagamento anterior ainda está em processamento. Aguarde antes de tentar novamente.",
          409
        );
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "brl",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await prisma.order.create({
      data: {
        user: {
          connect: { id: user.id },
        },
        amount: total / 100,
        currency: "brl",
        status: "pending",
        paymentIntentID: paymentIntent.id,
        products: {
          create: productData,
        },
      },
    });

    return Response.json({ paymentIntent });
  } catch (error) {
    console.error("Erro no checkout:", error);

    return erroJson("Não foi possível iniciar o pagamento.", 500);
  }
}
