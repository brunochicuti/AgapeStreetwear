
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

function respostaPagamento(
  paymentIntent: {
    id: string;
    client_secret: string | null;
  },
  orderId: string
) {
  return Response.json({
    paymentIntent: {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    },
    orderId,
  });
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

  if (
    typeof dados.complement !== "undefined" &&
    typeof dados.complement !== "string"
  ) {
    return "Complemento inválido.";
  }

if (dados.cpf.trim() && !validarCPF(dados.cpf)) {
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

function validarCheckoutKey(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      valor
    )
  );
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return erroJson("Não autenticado.", 401);
    }

    let body: Record<string, unknown>;

    try {
      const conteudo = await req.json();

      if (!conteudo || typeof conteudo !== "object" || Array.isArray(conteudo)) {
        return erroJson("Dados do checkout inválidos.", 400);
      }

      body = conteudo as Record<string, unknown>;
    } catch {
      return erroJson("Corpo da requisição inválido.", 400);
    }

    const items = body.items as ItemCarrinho[];
    const comprador = body.comprador as DadosComprador;
    const checkoutKey = body.checkoutKey;

    if (!validarCheckoutKey(checkoutKey)) {
      return erroJson("Identificação da compra inválida.", 400);
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

    if (
      !comprador ||
      typeof comprador !== "object" ||
      Array.isArray(comprador)
    ) {
      return erroJson("Dados do comprador ausentes.", 400);
    }

    const erroComprador = validarComprador(comprador);

    if (erroComprador) {
      return erroJson(erroComprador, 400);
    }

    const quantidades = new Map<string, number>();

    for (const item of items) {
      const quantidade = (quantidades.get(item.id) || 0) + item.quantity;

      if (quantidade > 100) {
        return erroJson(
          "A quantidade máxima por produto é 100 unidades.",
          400
        );
      }

      quantidades.set(item.id, quantidade);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: userId },
    });

    if (!user) {
      return erroJson("Usuário não encontrado.", 404);
    }

    const dadosPedido = {
      fullName: comprador.fullName.trim(),
      cpf: comprador.cpf.replace(/\D/g, "") || null,
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

    const productData = await Promise.all(
      Array.from(quantidades.entries()).map(
        async ([productId, quantity]) => {
          const product = await stripe.products.retrieve(productId);

          if (product.deleted || !product.active) {
            throw new Error("Um dos produtos não está disponível.");
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

          if (
            price.unit_amount === null ||
            price.unit_amount <= 0
          ) {
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

    if (
      !Number.isSafeInteger(subtotal) ||
      !Number.isSafeInteger(total) ||
      total <= FRETE_CENTAVOS
    ) {
      return erroJson("Valor total inválido.", 400);
    }

    const dadosFinanceiros = {
      subtotal: subtotal / 100,
      shippingCost: FRETE_CENTAVOS / 100,
      amount: total / 100,
    };

  const checkoutExistente = await prisma.order.findFirst({
    where: {
      checkoutKey,
      userId: user.id,
    },
    include: {
      products: {
        select: {
          name: true,
          quantity: true,
          price: true,
        },
      },
    },
  });

    if (checkoutExistente) {
      const produtosIguais =
  checkoutExistente.products.length === productData.length &&
  productData.every((novoProduto) => {
    const produtoExistente = checkoutExistente.products.find(
      (produto) => produto.name === novoProduto.name
    );

    return (
      produtoExistente !== undefined &&
      produtoExistente.quantity === novoProduto.quantity &&
      produtoExistente.price === novoProduto.price
    );
  });

if (!produtosIguais) {
  return erroJson(
    "O carrinho foi alterado. Inicie uma nova tentativa de compra.",
    409
  );
}

      if (
        checkoutExistente.status === "paid" ||
        checkoutExistente.status === "canceled" ||
        checkoutExistente.status === "review_required"
      ) {
        return erroJson(
          "Esta tentativa de compra já foi finalizada. Inicie uma nova compra.",
          409
        );
      }

      if (!checkoutExistente.paymentIntentID) {
        return erroJson(
          "O pedido não possui um pagamento associado. Inicie uma nova compra.",
          409
        );
      }

      const currentIntent =
        await stripe.paymentIntents.retrieve(
          checkoutExistente.paymentIntentID
        );

      if (
        (currentIntent.metadata.userId &&
          currentIntent.metadata.userId !== userId) ||
        (currentIntent.metadata.orderId &&
          currentIntent.metadata.orderId !== checkoutExistente.id) ||
        (currentIntent.metadata.checkoutKey &&
          currentIntent.metadata.checkoutKey !== checkoutKey)
      ) {
        return erroJson(
          "Não foi possível validar a tentativa de pagamento.",
          409
        );
      }

      if (currentIntent.status !== "requires_payment_method") {
        return erroJson(
          "O pagamento anterior ainda está em processamento ou já foi concluído.",
          409
        );
      }

      const updatedIntent =
        await stripe.paymentIntents.update(
          currentIntent.id,
          {
            amount: total,
            metadata: {
              userId,
              orderId: checkoutExistente.id,
              checkoutKey,
            },
          }
        );

      if (!updatedIntent.client_secret) {
        return erroJson(
          "Não foi possível preparar o pagamento.",
          500
        );
      }

      const order = await prisma.order.update({
        where: {
          id: checkoutExistente.id,
        },
        data: {
          ...dadosPedido,
          ...dadosFinanceiros,
          currency: "brl",
          status: "pending",
          products: {
            deleteMany: {},
            create: productData,
          },
        },
      });

      return respostaPagamento(updatedIntent, order.id);
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: total,
        currency: "brl",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId,
          checkoutKey,
        },
      },
      {
        idempotencyKey: `checkout-${user.id}-${checkoutKey}`,
      }
    );

    if (!paymentIntent.client_secret) {
      return erroJson(
        "Não foi possível preparar o pagamento.",
        500
      );
    }

    let order;

    try {
      order = await prisma.order.create({
        data: {
          user: {
            connect: { id: user.id },
          },
          ...dadosPedido,
          ...dadosFinanceiros,
          currency: "brl",
          status: "pending",
          checkoutKey,
          paymentIntentID: paymentIntent.id,
          products: {
            create: productData,
          },
        },
      });
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "P2002"
      ) {
        throw error;
      }

    const pedidoExistente = await prisma.order.findFirst({
      where: {
        checkoutKey,
        userId: user.id,
      },
      include: {
        products: {
          select: {
            name: true,
            quantity: true,
            price: true,
          },
        },
      },
    });

      if (
        !pedidoExistente ||
        !pedidoExistente.paymentIntentID ||
        pedidoExistente.status !== "pending"
      ) {
        return erroJson(
          "Não foi possível recuperar a tentativa de compra.",
          409
        );
      }

      const produtosIguais =
      pedidoExistente.products.length === productData.length &&
      productData.every((novoProduto) => {
        const produtoExistente = pedidoExistente.products.find(
          (produto) => produto.name === novoProduto.name
        );

        return (
          produtoExistente !== undefined &&
          produtoExistente.quantity === novoProduto.quantity &&
          produtoExistente.price === novoProduto.price
        );
      });

    if (!produtosIguais) {
      return erroJson(
        "A composição do pedido não corresponde à tentativa de compra.",
        409
      );
    }

      const intentExistente =
        await stripe.paymentIntents.retrieve(
          pedidoExistente.paymentIntentID
        );

      const pagamentoValido =
        pedidoExistente.paymentIntentID === paymentIntent.id &&
        intentExistente.metadata.userId === userId &&
        intentExistente.metadata.checkoutKey === checkoutKey &&
        (!intentExistente.metadata.orderId ||
          intentExistente.metadata.orderId === pedidoExistente.id) &&
        intentExistente.amount === Math.round(pedidoExistente.amount * 100) &&
        intentExistente.currency === "brl" &&
        intentExistente.status === "requires_payment_method" &&
        !!intentExistente.client_secret;

      if (!pagamentoValido) {
        return erroJson(
          "Não foi possível validar a tentativa de pagamento.",
          409
        );
      }

      return respostaPagamento(
        intentExistente,
        pedidoExistente.id
      );
    }

    const intentAtualizado =
      await stripe.paymentIntents.update(
        paymentIntent.id,
        {
          metadata: {
            userId,
            checkoutKey,
            orderId: order.id,
          },
        }
      );

    if (!intentAtualizado.client_secret) {
      return erroJson(
        "Não foi possível preparar o pagamento.",
        500
      );
    }

    return respostaPagamento(intentAtualizado, order.id);
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
