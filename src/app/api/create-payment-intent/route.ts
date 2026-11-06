
import { auth } from "@clerk/nextjs/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";
import Stripe from "stripe";

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

function validarCheckoutKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function mesmoCarrinho(
  produtosExistentes: {
    name: string;
    price: number;
    quantity: number;
  }[],
  produtosNovos: {
    name: string;
    price: number;
    quantity: number;
  }[]
) {
  if (produtosExistentes.length !== produtosNovos.length) {
    return false;
  }

  const ordenar = (
    produtos: { name: string; price: number; quantity: number }[]
  ) =>
    [...produtos].sort((a, b) =>
      `${a.name}-${a.price}`.localeCompare(`${b.name}-${b.price}`)
    );

  const existentes = ordenar(produtosExistentes);
  const novos = ordenar(produtosNovos);

  return existentes.every(
    (produto, index) =>
      produto.name === novos[index].name &&
      produto.price === novos[index].price &&
      produto.quantity === novos[index].quantity
  );
}

function mesmoComprador(
  pedido: {
    cpf: string | null;
    email: string | null;
    zipCode: string | null;
    street: string | null;
    number: string | null;
  },
  comprador: DadosComprador
) {
  return (
    pedido.cpf === comprador.cpf.replace(/\D/g, "") &&
    pedido.email === comprador.email.trim().toLowerCase() &&
    pedido.zipCode === comprador.zipCode.replace(/\D/g, "") &&
    pedido.street === comprador.street.trim() &&
    pedido.number === comprador.number.trim()
  );
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
    const checkoutKey = body.checkoutKey;

    if (!validarCheckoutKey(checkoutKey)) {
      return erroJson(
        "Identificação da tentativa de checkout inválida.",
        400
      );
    }

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

    if (!comprador || typeof comprador !== "object") {
      return erroJson("Dados do comprador ausentes.", 400);
    }

    const erroComprador = validarComprador(comprador);

    if (erroComprador) {
      return erroJson(erroComprador, 400);
    }

    const quantidades = new Map<string, number>();

    for (const item of items) {
      const quantidadeAtual = quantidades.get(item.id) || 0;
      const novaQuantidade = quantidadeAtual + item.quantity;

      if (novaQuantidade > 100) {
        return erroJson(
          "A quantidade máxima por produto é 100.",
          400
        );
      }

      quantidades.set(item.id, novaQuantidade);
    }

    const productData = await Promise.all(
      Array.from(quantidades.entries()).map(
        async ([productId, quantity]) => {
          const product = await stripe.products.retrieve(productId);

          if ("deleted" in product || !product.active) {
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

          if (price.unit_amount === null || price.unit_amount <= 0) {
            throw new Error("Preço inválido para um produto.");
          }

          return {
            name: product.name,
            description: product.description,
            quantity,
            price: price.unit_amount,
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

    // Procura uma tentativa anterior com a mesma chave.
    let order = await prisma.order.findUnique({
      where: {
        checkoutKey,
      },
      include: {
        products: true,
      },
    });

    if (order && order.userId !== user.id) {
      return erroJson(
        "Esta tentativa de checkout não pertence a este usuário.",
        403
      );
    }

    // Se a tentativa já existe, não permite alterar seu conteúdo.
    if (order) {
      const carrinhoIgual = mesmoCarrinho(
        order.products,
        productData
      );

      const compradorIgual = mesmoComprador(
        order,
        comprador
      );

      if (
        !carrinhoIgual ||
        !compradorIgual ||
        Math.round(order.amount * 100) !== total ||
        order.currency !== "brl"
      ) {
        return erroJson(
          "Os dados desta tentativa foram alterados. Inicie uma nova tentativa de checkout.",
          409
        );
      }
    } else {
      // Cria o pedido antes de criar o pagamento.
      try {
        order = await prisma.order.create({
          data: {
            user: {
              connect: { id: user.id },
            },
            ...dadosPedido,
            currency: "brl",
            status: "pending",
            checkoutKey,
            products: {
              create: productData,
            },
          },
          include: {
            products: true,
          },
        });
      } catch (error) {
        // Outra requisição pode ter criado a mesma tentativa.
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
        ) {
          order = await prisma.order.findUnique({
            where: {
              checkoutKey,
            },
            include: {
              products: true,
            },
          });

          if (!order || order.userId !== user.id) {
            return erroJson(
              "Não foi possível recuperar a tentativa de checkout.",
              409
            );
          }
        } else {
          throw error;
        }
      }
    }

    if (!order) {
      return erroJson(
        "Não foi possível criar o pedido.",
        500
      );
    }

    // Se já existe um PaymentIntent, recupera e valida.
    if (order.paymentIntentID) {
      const existingIntent =
        await stripe.paymentIntents.retrieve(
          order.paymentIntentID
        );

      if (
        existingIntent.amount !== total ||
        existingIntent.currency !== "brl" ||
        existingIntent.metadata.orderId !== order.id
      ) {
        console.error(
          "Divergência no PaymentIntent do pedido:",
          order.id
        );

        return erroJson(
          "Não foi possível validar o pagamento anterior.",
          409
        );
      }

      if (
        existingIntent.status === "requires_payment_method" ||
        existingIntent.status === "requires_confirmation" ||
        existingIntent.status === "requires_action"
      ) {
        return Response.json({
          paymentIntent: existingIntent,
          orderId: order.id,
        });
      }

      if (existingIntent.status === "succeeded") {
        return erroJson(
          "Este pedido já foi pago.",
          409
        );
      }

      return erroJson(
        "O pagamento anterior não pode ser reutilizado. Inicie uma nova tentativa.",
        409
      );
    }

    // A mesma chave sempre recupera o mesmo PaymentIntent na Stripe.
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: total,
        currency: "brl",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: order.id,
          checkoutKey,
          userId: user.id.toString(),
        },
      },
      {
        idempotencyKey: `checkout-${checkoutKey}`,
      }
    );

    if (
      paymentIntent.amount !== total ||
      paymentIntent.currency !== "brl" ||
      paymentIntent.metadata.orderId !== order.id
    ) {
      console.error(
        "PaymentIntent retornado com dados divergentes:",
        order.id
      );

      return erroJson(
        "Não foi possível validar o pagamento criado.",
        500
      );
    }

    // Salva o identificador do pagamento no pedido.
    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        paymentIntentID: paymentIntent.id,
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
