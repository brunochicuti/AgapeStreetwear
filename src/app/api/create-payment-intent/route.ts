
import { auth } from "@clerk/nextjs/server";
import prisma from "@/src/lib/prisma";
import { stripe } from "@/src/lib/stripe";
import { createHash, createHmac } from "node:crypto";
import { verificarRateLimitCheckout } from "@/src/lib/rate-limit";

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

function gerarDadosTokenAcompanhamento(orderId: string) {
  const secret = process.env.TRACKING_TOKEN_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Chave de acompanhamento ausente ou inválida.");
  }

  const token = createHmac("sha256", secret)
    .update(`agape-order-tracking:${orderId}`)
    .digest("base64url");

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  return { token, tokenHash };
}

async function obterTokenAcompanhamento(orderId: string) {
  const { token, tokenHash } = gerarDadosTokenAcompanhamento(orderId);

  await prisma.order.updateMany({
    where: {
      id: orderId,
      trackingTokenHash: null,
    },
    data: {
      trackingTokenHash: tokenHash,
      trackingTokenCreatedAt: new Date(),
    },
  });

  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    select: { trackingTokenHash: true },
  });

  if (!pedido || pedido.trackingTokenHash !== tokenHash) {
    throw new Error("Não foi possível validar o token de acompanhamento.");
  }

  return token;
}

function respostaPagamento(
  paymentIntent: {
    id: string;
    client_secret: string | null;
  },
  orderId: string,
  trackingToken: string
) {
  return Response.json({
    paymentIntent: {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    },
    orderId,
    trackingToken,
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
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return "Dados do comprador inválidos.";
  }

  const camposObrigatorios: [string, unknown, number][] = [
    ["Nome", dados.fullName, 120],
    ["E-mail", dados.email, 254],
    ["Telefone", dados.phone, 20],
    ["CEP", dados.zipCode, 9],
    ["Rua", dados.street, 120],
    ["Número", dados.number, 20],
    ["Bairro", dados.neighborhood, 100],
    ["Cidade", dados.city, 100],
    ["Estado", dados.state, 2],
  ];

  for (const [nome, valor, limite] of camposObrigatorios) {
    if (
      typeof valor !== "string" ||
      !valor.trim() ||
      valor.length > limite
    ) {
      return `${nome} inválido ou não informado.`;
    }
  }

  if (
    typeof dados.complement !== "undefined" &&
    (typeof dados.complement !== "string" ||
      dados.complement.length > 100)
  ) {
    return "Complemento inválido.";
  }

  if (
    typeof dados.cpf !== "undefined" &&
    typeof dados.cpf !== "string"
  ) {
    return "CPF inválido.";
  }

  const cpf = dados.cpf ?? "";

  if (cpf.trim() && !validarCPF(cpf)) {
    return "Informe um CPF válido.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
    return "Informe um e-mail válido.";
  }

  const telefone = dados.phone.replace(/\D/g, "");

  if (telefone.length < 10 || telefone.length > 13) {
    return "Informe um telefone válido.";
  }

  if (dados.zipCode.replace(/\D/g, "").length !== 8) {
    return "Informe um CEP válido.";
  }

  if (!/^[A-Za-z]{2}$/.test(dados.state.trim())) {
    return "Informe uma UF válida.";
  }

  const cidade = dados.city
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    dados.state.trim().toUpperCase() !== "MS" ||
    !["dourados", "maracaju"].includes(cidade)
  ) {
    return "Entrega disponível apenas para Dourados/MS e Maracaju/MS.";
  }
  return null;
}


async function validarCepEntrega(
  dados: DadosComprador
): Promise<string | null> {
  const cep = dados.zipCode.replace(/\D/g, "");

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${cep}/json/`,
      {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return "Não foi possível validar o CEP. Tente novamente.";
    }

    const resultado: unknown = await response.json();

    if (
      !resultado ||
      typeof resultado !== "object" ||
      Array.isArray(resultado)
    ) {
      return "Não foi possível validar o CEP. Tente novamente.";
    }

    const endereco = resultado as Record<string, unknown>;

    if (endereco.erro === true) {
      return "CEP não encontrado.";
    }

    if (
      typeof endereco.cep !== "string" ||
      typeof endereco.localidade !== "string" ||
      typeof endereco.uf !== "string"
    ) {
      return "Não foi possível validar o CEP. Tente novamente.";
    }

    if (endereco.cep.replace(/\D/g, "") !== cep) {
      return "Não foi possível confirmar o CEP informado.";
    }

    const normalizar = (valor: string) =>
      valor
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const cidadeCep = normalizar(endereco.localidade);
    const cidadeComprador = normalizar(dados.city);
    const ufCep = endereco.uf.trim().toUpperCase();
    const ufComprador = dados.state.trim().toUpperCase();

    if (
      ufCep !== "MS" ||
      !["dourados", "maracaju"].includes(cidadeCep)
    ) {
      return "Entrega disponível apenas para Dourados/MS e Maracaju/MS.";
    }

    if (cidadeComprador !== cidadeCep || ufComprador !== ufCep) {
      return "A cidade ou o estado informado não corresponde ao CEP.";
    }

    return null;
  } catch {
    return "Não foi possível validar o CEP. Tente novamente.";
  }
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

    const limite = await verificarRateLimitCheckout(req, userId);

    if (!limite.allowed) {
      return Response.json(
        { error: "Muitas tentativas de checkout. Aguarde antes de tentar novamente." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limite.retryAfterSeconds),
          },
        }
      );
    }

    const contentLength = req.headers.get("content-length");

    if (contentLength !== null) {
      const tamanho = Number(contentLength);

      if (!Number.isSafeInteger(tamanho) || tamanho < 0 || tamanho > 16 * 1024) {
        return erroJson("Requisição muito grande ou inválida.", 413);
      }
    }

    let body: Record<string, unknown>;

    try {
      const texto = await req.text();

      if (new TextEncoder().encode(texto).length > 16 * 1024) {
        return erroJson("Requisição muito grande.", 413);
      }

      const conteudo = JSON.parse(texto);

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
          !/^prod_[a-zA-Z0-9]{1,100}$/.test(item.id) ||
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

    const erroCep = await validarCepEntrega(comprador);

    if (erroCep) {
      return erroJson(erroCep, 400);
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

    if (user.deletionRequestedAt) {
      return erroJson(
        "Esta conta está em processo de exclusão e não pode iniciar novas compras.",
        403
      );
    }

    const dadosPedido = {
      fullName: comprador.fullName.trim(),
      cpf: (comprador.cpf ?? "").replace(/\D/g, "") || null,
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
              price.type === "one_time" &&
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
          stripeProductId: productId,
          name: product.name,
          description: product.description,
          quantity,
          unitPrice: price.unit_amount,
          image: product.images[0] || null,
        };
        }
      )
    );

    const subtotal = productData.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
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
      items: {
        select: {
          stripeProductId: true,
          name: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  });

    if (checkoutExistente) {
const produtosIguais =
  checkoutExistente.items.length === productData.length &&
  productData.every((novoProduto) => {
    const produtoExistente = checkoutExistente.items.find((produto) =>
      produto.stripeProductId
        ? produto.stripeProductId === novoProduto.stripeProductId
        : produto.name === novoProduto.name
    );

    return (
      produtoExistente !== undefined &&
      produtoExistente.quantity === novoProduto.quantity &&
      produtoExistente.unitPrice === novoProduto.unitPrice
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
        currentIntent.metadata.userId !== userId ||
        currentIntent.metadata.checkoutKey !== checkoutKey ||
        (currentIntent.metadata.orderId &&
          currentIntent.metadata.orderId !== checkoutExistente.id) ||
        currentIntent.amount !== total ||
        currentIntent.currency !== "brl"
      ) {
        return erroJson(
          "Não foi possível validar a tentativa de pagamento.",
          409
        );
      }

      if (
        !["pending", "failed"].includes(checkoutExistente.status) ||
        currentIntent.status !== "requires_payment_method"
      ) {
        return erroJson(
          "O pagamento anterior não pode ser reutilizado. Consulte o pedido antes de iniciar outra tentativa.",
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

      const order = await prisma.$transaction(async (tx) => {
        const dadosAtualizacao = {
          ...dadosPedido,
          ...dadosFinanceiros,
          currency: "brl",
          status: "pending",
        };

        const reabertura = await tx.order.updateMany({
          where: {
            id: checkoutExistente.id,
            status: "failed",
          },
          data: dadosAtualizacao,
        });

        if (reabertura.count > 0) {
          await tx.orderStatusHistory.create({
            data: {
              orderId: checkoutExistente.id,
              fromStatus: "failed",
              toStatus: "pending",
              source: "checkout",
            },
          });
        } else {
          const atualizacaoPendente = await tx.order.updateMany({
            where: {
              id: checkoutExistente.id,
              status: "pending",
            },
            data: dadosAtualizacao,
          });

          if (atualizacaoPendente.count === 0) {
            return null;
          }
        }

        return tx.order.update({
          where: {
            id: checkoutExistente.id,
          },
          data: {
            items: {
              deleteMany: {},
              create: productData,
            },
          },
        });
      });

      if (!order) {
        return erroJson(
          "Esta tentativa de compra foi finalizada ou precisa de verificação. Atualize a página e consulte o pedido.",
          409
        );
      }

      const trackingToken = await obterTokenAcompanhamento(order.id);

      return respostaPagamento(
        updatedIntent,
        order.id,
        trackingToken
      );
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
          items: {
            create: productData,
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: "pending",
              source: "checkout",
            },
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
        items: {
          select: {
            stripeProductId: true,
            name: true,
            quantity: true,
            unitPrice: true,
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
      pedidoExistente.items.length === productData.length &&
      productData.every((novoProduto) => {
        const produtoExistente = pedidoExistente.items.find((produto) =>
          produto.stripeProductId
            ? produto.stripeProductId === novoProduto.stripeProductId
            : produto.name === novoProduto.name
        );

        return (
          produtoExistente !== undefined &&
          produtoExistente.quantity === novoProduto.quantity &&
          produtoExistente.unitPrice === novoProduto.unitPrice
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
        pedidoExistente.subtotal === subtotal / 100 &&
        pedidoExistente.shippingCost === FRETE_CENTAVOS / 100 &&
        pedidoExistente.amount === total / 100 &&
        intentExistente.amount === total &&
        intentExistente.currency === "brl" &&
        intentExistente.status === "requires_payment_method" &&
        !!intentExistente.client_secret;

      if (!pagamentoValido) {
        return erroJson(
          "Não foi possível validar a tentativa de pagamento.",
          409
        );
      }

      const intentRecuperado =
        await stripe.paymentIntents.update(
          intentExistente.id,
          {
            metadata: {
              userId,
              checkoutKey,
              orderId: pedidoExistente.id,
            },
          }
        );

      if (!intentRecuperado.client_secret) {
        return erroJson(
          "Não foi possível recuperar o pagamento.",
          500
        );
      }

      const trackingToken = await obterTokenAcompanhamento(
        pedidoExistente.id
      );

      return respostaPagamento(
        intentRecuperado,
        pedidoExistente.id,
        trackingToken
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

    const trackingToken = await obterTokenAcompanhamento(order.id);

    return respostaPagamento(
      intentAtualizado,
      order.id,
      trackingToken
    );
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
