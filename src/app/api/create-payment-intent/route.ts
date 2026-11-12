import { auth } from "@clerk/nextjs/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";

const FRETE_CENTAVOS = 500;

type ItemCarrinho = {
 id: string;
 quantity: number;
};

type DadosComprador = {
 fullName: string;
 cpf: string;
 email: string;
 phone: string;
 zipCode: string;
 street: string;
 number: string;
 complement?: string;
 neighborhood: string;
 city: string;
 state: string;
};

function erroJson(error: string, status: number) {
 return Response.json({ error }, { status });
}

function validarCPF(cpf: string) {
 const numeros = cpf.replace(/\D/g, "");

 if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) {
  return false;
 }

 for (let tamanho = 9; tamanho <= 10; tamanho++) {
  let soma = 0;

 for (let i = 0; i < tamanho; i++) {
 soma += Number(numeros[i]) * (tamanho + 1 - i);
 }

 const resto = (soma * 10) % 11;
 const digito = resto === 10 ? 0 : resto;

 if (digito !== Number(numeros[tamanho])) {
 return false;
 }
 }

 return true;
}

function validarComprador(dados: DadosComprador) {
 const obrigatorios = [
 dados.fullName,
 dados.cpf,
 dados.email,
 dados.phone,
 dados.zipCode,
 dados.street,
 dados.number,
 dados.neighborhood,
 dados.city,
 dados.state,
 ];

 if (
 obrigatorios.some(
 (valor) => typeof valor !== "string" || !valor.trim()
 )
 ) {
 return "Preencha todos os campos obrigatórios.";
 }

 if (!validarCPF(dados.cpf)) {
 return "Informe um CPF válido.";
 }

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
  return "Informe um e-mail válido.";
 }

 if (dados.phone.replace(/\D/g, "").length < 10) {
  return "Informe um telefone válido.";
 }

 if (dados.zipCode.replace(/\D/g, "").length !== 8) {
  return "Informe um CEP válido.";
 }

 if (!/^[A-Za-z]{2}$/.test(dados.state)) {
  return "Informe uma UF válida.";
 }

 return null;
}

export async function POST(req: Request) {
 try {
  const { userId } = await auth();

  if (!userId) {
   return erroJson("Não autenticado.", 401);
  }

  const body = await req.json();

    const items = body.items as ItemCarrinho[];
    const comprador = body.comprador as DadosComprador;
    const payment_intent_id = body.payment_intent_id;

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 50 ||
      items.some(
        (item) =>
          !item ||
          typeof item.id !== "string" ||
          !item.id.trim() ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0 ||
          item.quantity > 100
      )
    ) {
      return erroJson("Itens do pedido inválidos.", 400);
    }

    if (
      !comprador ||
      typeof comprador !== "object"
    ) {
      return erroJson("Dados do comprador ausentes.", 400);
    }

    const erroComprador = validarComprador(comprador);

    if (erroComprador) {
      return erroJson(erroComprador, 400);
    }

    const quantidades = new Map<string, number>();

    for (const item of items) {
      quantidades.set(
        item.id,
        (quantidades.get(item.id) || 0) + item.quantity
      );
    }

    const productData = await Promise.all(
      Array.from(quantidades.entries()).map(
        async ([productId, quantity]) => {
          const product = await stripe.products.retrieve(productId);

          if (product.deleted || !product.active) {
            throw new Error(
              "Um dos produtos não está disponível."
            );
          }

          const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 100,
          });

          const activePrices = prices.data.filter(
            (price) =>
              price.currency === "brl" &&
              price.unit_amount !== null
          );

          if (activePrices.length !== 1) {
            throw new Error(
              `O produto "${product.name}" não possui exatamente um preço ativo em reais.`
            );
          }

          const price = activePrices[0];

          if (price.unit_amount! <= 0) {
            throw new Error("Preço inválido para um produto.");
          }

          return {
            name: product.name,
            description: product.description,
            quantity,
            price: price.unit_amount!,
            image: product.images[0] || null,
          };
        }
      )
    );

    const subtotal = productData.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    const total = subtotal + FRETE_CENTAVOS;

    if (!Number.isSafeInteger(total) || total <= FRETE_CENTAVOS) {
      return erroJson("Valor total inválido.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: userId },
    });

    if (!user) {
      return erroJson("Usuário não encontrado.", 404);
    }

    const dadosPedido = {
      subtotal: subtotal / 100,
      shippingCost: FRETE_CENTAVOS / 100,
      amount: total / 100,
      fullName: comprador.fullName.trim(),
      cpf: comprador.cpf.replace(/\D/g, ""),
      email: comprador.email.trim().toLowerCase(),
      phone: comprador.phone.replace(/\D/g, ""),
      zipCode: comprador.zipCode.replace(/\D/g, ""),
      street: comprador.street.trim(),
      number: comprador.number.trim(),
      complement: comprador.complement?.trim() || null,
      neighborhood: comprador.neighborhood.trim(),
      city: comprador.city.trim(),
      state: comprador.state.trim().toUpperCase(),
    };

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
        const updatedIntent =
          await stripe.paymentIntents.update(payment_intent_id, {
            amount: total,
          });

        await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            ...dadosPedido,
            products: {
              deleteMany: {},
              create: productData,
            },
          },
        });

        return Response.json({
          paymentIntent: updatedIntent,
          orderId: existingOrder.id,
        });
      }

      if (
        currentIntent.status !== "succeeded" &&
        currentIntent.status !== "canceled"
      ) {
        return erroJson(
          "O pagamento anterior ainda está em processamento.",
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

    const order = await prisma.order.create({
      data: {
        user: {
          connect: { id: user.id },
        },
        ...dadosPedido,
        currency: "brl",
        status: "pending",
        paymentIntentID: paymentIntent.id,
        products: {
          create: productData,
        },
      },
    });

    return Response.json({
      paymentIntent,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Erro no checkout:", error);

    if (error instanceof Error) {
      const mensagem = error.message;

      if (
        mensagem.includes("não está disponível") ||
        mensagem.includes("preço ativo") ||
        mensagem.includes("Preço inválido")
      ) {
        return erroJson(mensagem, 400);
      }
    }

    return erroJson(
      "Não foi possível iniciar o pagamento.",
      500
    );
  }
}