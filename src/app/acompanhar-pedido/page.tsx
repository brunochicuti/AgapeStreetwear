
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Produto = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string | null;
};

type EventoStatus = {
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
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
  statusHistory: EventoStatus[];
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

function corStatus(status: string) {
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  if (status === "review_required") return "bg-orange-100 text-orange-700";

  return "bg-gray-100 text-gray-700";
}

function obterNomeStatus(status: string) {
  const nomes: Record<string, string> = {
    pending: "Pagamento pendente",
    paid: "Pagamento aprovado",
    failed: "Pagamento não aprovado",
    canceled: "Pedido cancelado",
    review_required: "Pagamento em análise",
    preparing: "Pedido em preparação",
    ready: "Pedido pronto",
    shipped: "Pedido enviado",
    delivered: "Pedido entregue",
  };

  return nomes[status] ?? "Status não identificado";
}

function HistoricoPedido({
  historico,
}: {
  historico: EventoStatus[];
}) {
  if (!historico?.length) {
    return (
      <p className="text-sm text-gray-500">
        Nenhuma atualização disponível.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {historico.map((evento, index) => (
        <div key={`${evento.toStatus}-${evento.createdAt}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full bg-black" />
            {index !== historico.length - 1 && (
              <span className="mt-1 min-h-8 w-px flex-1 bg-gray-300" />
            )}
          </div>

          <div className="pb-2">
            <p className="text-sm font-bold">
              {obterNomeStatus(evento.toStatus)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {new Date(evento.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListaProdutos({
  produtos,
  moeda,
}: {
  produtos: Produto[];
  moeda: string;
}) {
  return (
    <div className="space-y-4">
      {produtos.map((produto) => (
        <div key={produto.id} className="flex items-center gap-4">
          {produto.image ? (
            <Image
            src={produto.image}
            alt={produto.name}
            width={64}
            height={80}
            unoptimized
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
              moeda
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

function ResumoPedido({ pedido }: { pedido: Pedido }) {
  return (
    <div className="space-y-3 border-t border-gray-200 pt-5 text-sm">
      <div className="flex justify-between text-gray-500">
        <span>Subtotal</span>
        <span>{formatarPreco(pedido.subtotal, pedido.currency)}</span>
      </div>

      <div className="flex justify-between text-gray-500">
        <span>Frete</span>
        <span>{formatarPreco(pedido.shippingCost, pedido.currency)}</span>
      </div>

      <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-black">
        <span>Total</span>
        <span>{formatarPreco(pedido.amount, pedido.currency)}</span>
      </div>
    </div>
  );
}

export default function AcompanharPedidoPage() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [modoIndividual, setModoIndividual] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;

    async function consultarPedidos() {
      try {
        const token = new URLSearchParams(window.location.search).get("token");

        if (token) {
          setModoIndividual(true);

          const resposta = await fetch(
            `/api/acompanhar-pedido?token=${encodeURIComponent(token)}`,
            { cache: "no-store" }
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

          return;
        }

        const resposta = await fetch("/api/meus-pedidos", {
          cache: "no-store",
        });

        if (resposta.status === 401) {
        router.push(
        "/sign-in?redirectUrl=" +
            encodeURIComponent("/acompanhar-pedido")
        );
          return;
        }

        const resultado = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            resultado.error || "Não foi possível consultar seus pedidos."
          );
        }

        if (!cancelado) {
          setPedidos(resultado.orders ?? []);
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível consultar os pedidos."
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    consultarPedidos();

    return () => {
      cancelado = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-white px-5 py-12 text-black">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400">
            Agape Streetwear
          </p>

          <h1 className="mt-3 text-2xl font-black uppercase sm:text-3xl">
            {modoIndividual ? "Acompanhamento do pedido" : "Meus pedidos"}
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            {modoIndividual
              ? "Consulte as informações do seu pedido."
              : "Consulte seus pedidos e a situação dos pagamentos."}
          </p>
        </header>

        {carregando ? (
          <div className="rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">
              Consultando seus pedidos...
            </p>
          </div>
        ) : erro ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-bold text-red-700">{erro}</p>
          </div>
        ) : modoIndividual && pedido ? (
          <div className="rounded-2xl border border-gray-200 p-6 sm:p-10">
            <section className="border-b border-gray-200 pb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Número do pedido
              </p>

              <p className="mt-2 break-all text-sm font-bold">{pedido.id}</p>

              <p className="mt-4 text-xs text-gray-400">
                Realizado em{" "}
                {new Date(pedido.createdDate).toLocaleDateString("pt-BR")}
              </p>
            </section>

            <section className="border-b border-gray-200 py-6">
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Situação do pagamento
              </h2>

              <p className={`mt-3 inline-flex rounded-full px-4 py-2 text-sm font-bold ${corStatus(pedido.status)}`}>
                {obterStatusPagamento(pedido.status)}
              </p>
            </section>

            <section className="border-b border-gray-200 py-6">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-wider">
                Histórico do pedido
            </h2>

            <HistoricoPedido historico={pedido.statusHistory} />
            </section>

            <section className="py-6">
              <h2 className="mb-5 text-sm font-bold uppercase tracking-wider">
                Produtos
              </h2>

              <ListaProdutos
                produtos={pedido.products}
                moeda={pedido.currency}
              />
            </section>

            <ResumoPedido pedido={pedido} />
          </div>
        ) : !modoIndividual && pedidos.length > 0 ? (
          <div className="space-y-6">
            {pedidos.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-200 p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Número do pedido
                    </p>
                    <p className="mt-2 break-all text-sm font-bold">
                      {item.id}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(item.createdDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <span className={`rounded-full px-4 py-2 text-xs font-bold ${corStatus(item.status)}`}>
                    {obterStatusPagamento(item.status)}
                  </span>
                </div>

                <section className="py-6">
                  <h2 className="mb-5 text-sm font-bold uppercase tracking-wider">
                    Produtos
                  </h2>

                  <ListaProdutos
                    produtos={item.products}
                    moeda={item.currency}
                  />
                </section>

                <ResumoPedido pedido={item} />
              </article>
            ))}
          </div>
        ) : !modoIndividual ? (
          <div className="rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-lg font-bold">Nenhum pedido encontrado</p>
            <p className="mt-2 text-sm text-gray-500">
              Quando você realizar uma compra, ela aparecerá aqui.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-black px-6 py-3 text-sm font-bold uppercase text-white"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">
              Não foi possível localizar os dados deste pedido.
            </p>
          </div>
        )}

        <Link
          href="/"
          className="mt-8 block w-full rounded-lg border border-gray-300 px-6 py-4 text-center text-sm font-bold uppercase tracking-wider text-black transition hover:bg-gray-100"
        >
          Voltar à loja
        </Link>
      </div>
    </main>
  );
}
