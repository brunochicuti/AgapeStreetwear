
"use client";

import { useEffect, useState } from "react";

type Produto = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string | null;
};

type Pedido = {
  id: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  amount: number;
  currency: string;
  createdDate: string;
  products: Produto[];
};

function formatarPreco(valor: number, moeda: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda.toUpperCase(),
  }).format(valor);
}

function obterStatusPagamento(status: string) {
  const statusMap: Record<string, string> = {
    pending: "Pagamento pendente",
    paid: "Pagamento aprovado",
    failed: "Pagamento não aprovado",
    canceled: "Pagamento cancelado",
    review_required: "Pagamento em análise",
  };

  return statusMap[status] ?? "Status não identificado";
}

export default function AcompanharPedidoPage() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function consultarPedido() {
      try {
        const token = new URLSearchParams(window.location.search).get("token");

        if (!token) {
          setErro("Link de acompanhamento inválido ou incompleto.");
          return;
        }

        const resposta = await fetch(
          `/api/acompanhar-pedido?token=${encodeURIComponent(token)}`,
          {
            cache: "no-store",
          }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            resultado.error || "Não foi possível localizar seu pedido."
          );
        }

        if (!cancelado) {
          setPedido(resultado.order);
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível consultar o pedido."
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    consultarPedido();

    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white px-5 py-12 text-black">
    <meta name="referrer" content="no-referrer" />
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400">
            Agape Streetwear
          </p>

          <h1 className="mt-3 text-2xl font-black uppercase sm:text-3xl">
            Acompanhamento do pedido
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Consulte as informações do seu pedido.
          </p>
        </header>

        {carregando ? (
          <div className="rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">
              Consultando seu pedido...
            </p>
          </div>
        ) : erro ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-bold text-red-700">{erro}</p>

            <a
              href="/"
              className="mt-6 inline-block rounded-lg bg-black px-6 py-3 text-sm font-bold uppercase text-white"
            >
              Voltar à loja
            </a>
          </div>
        ) : pedido ? (
          <div className="rounded-2xl border border-gray-200 p-6 sm:p-10">
            <section className="border-b border-gray-200 pb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Número do pedido
              </p>

              <p className="mt-2 break-all text-sm font-bold">
                {pedido.id}
              </p>

              <p className="mt-4 text-xs text-gray-400">
                Realizado em{" "}
                {new Date(pedido.createdDate).toLocaleDateString("pt-BR")}
              </p>
            </section>

            <section className="border-b border-gray-200 py-6">
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Situação do pagamento
              </h2>

              <p
                className={`mt-3 inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                  pedido.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : pedido.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {obterStatusPagamento(pedido.status)}
              </p>
            </section>

            <section className="border-b border-gray-200 py-6">
              <h2 className="mb-5 text-sm font-bold uppercase tracking-wider">
                Produtos
              </h2>

              <div className="space-y-5">
                {pedido.products.map((produto) => (
                  <div
                    key={produto.id}
                    className="flex items-center gap-4"
                  >
                    {produto.image ? (
                      <img
                        src={produto.image}
                        alt={produto.name}
                        className="h-20 w-16 rounded-lg bg-gray-100 object-cover"
                      />
                    ) : (
                      <div className="h-20 w-16 rounded-lg bg-gray-100" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{produto.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Quantidade: {produto.quantity}
                      </p>
                    </div>

                    <p className="whitespace-nowrap text-sm font-semibold">
                      {formatarPreco(
                        (produto.price * produto.quantity) / 100,
                        pedido.currency
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 pt-6 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>
                  {formatarPreco(pedido.subtotal, pedido.currency)}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Frete</span>
                <span>
                  {formatarPreco(pedido.shippingCost, pedido.currency)}
                </span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-black">
                <span>Total</span>
                <span>
                  {formatarPreco(pedido.amount, pedido.currency)}
                </span>
              </div>
            </section>

            <div className="mt-8 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              As informações de preparação e entrega do pedido serão
              disponibilizadas conforme as etapas de atendimento forem
              implementadas.
            </div>
          </div>
        ) : null}

        <a
          href="/"
          className="mt-8 block w-full rounded-lg border border-gray-300 px-6 py-4 text-center text-sm font-bold uppercase tracking-wider text-black transition hover:bg-gray-100"
        >
          Voltar à loja
        </a>
      </div>
    </main>
  );
}