
"use client";

import { useCallback, useEffect, useState } from "react";

type Produto = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
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
  fullName: string | null;
  email: string | null;
  phone: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  items: Produto[];
  statusHistory: EventoStatus[];
};

const proximoStatus: Record<string, string> = {
  paid: "preparing",
  preparing: "ready",
  ready: "shipped",
  shipped: "delivered",
};

const nomesStatus: Record<string, string> = {
  pending: "Pagamento pendente",
  paid: "Pagamento aprovado",
  failed: "Pagamento não aprovado",
  canceled: "Cancelado",
  review_required: "Pagamento em análise",
  preparing: "Em preparação",
  ready: "Pronto para envio",
  shipped: "Enviado",
  delivered: "Entregue",
};

function preco(valor: number, moeda: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda.toUpperCase(),
  }).format(valor);
}

export default function AdminPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizando, setAtualizando] = useState<string | null>(null);

  const carregarPedidos = useCallback(async () => {
    try {
      setErro("");

      const resposta = await fetch("/api/admin/pedidos", {
        cache: "no-store",
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error || "Não foi possível consultar os pedidos."
        );
      }

      setPedidos(dados.orders ?? []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao consultar pedidos."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  async function atualizarStatus(pedido: Pedido) {
    const novoStatus = proximoStatus[pedido.status];

    if (!novoStatus) return;

    const confirmar = window.confirm(
      `Deseja alterar o pedido ${pedido.id} para "${nomesStatus[novoStatus]}"?`
    );

    if (!confirmar) return;

    try {
      setAtualizando(pedido.id);
      setErro("");

      const resposta = await fetch(
        `/api/admin/pedidos/${encodeURIComponent(pedido.id)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: novoStatus }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error || "Não foi possível atualizar o pedido."
        );
      }

      await carregarPedidos();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar o pedido."
      );
    } finally {
      setAtualizando(null);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-500">
              Agape Streetwear
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase">
              Administração
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Gerenciamento de pedidos e entregas.
            </p>
          </div>

          <button
            onClick={carregarPedidos}
            className="rounded-lg border border-neutral-700 px-5 py-3 text-sm font-bold transition hover:bg-neutral-800"
          >
            Atualizar pedidos
          </button>
        </header>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-900 bg-red-950 p-4 text-sm text-red-300">
            {erro}
          </div>
        )}

        {carregando ? (
          <p className="py-16 text-center text-neutral-400">
            Carregando pedidos...
          </p>
        ) : pedidos.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 p-10 text-center">
            <p className="font-bold">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pedidos.map((pedido) => {
              const proximo = proximoStatus[pedido.status];

              return (
                <article
                  key={pedido.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8"
                >
                  <div className="flex flex-wrap justify-between gap-4 border-b border-neutral-800 pb-5">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-neutral-500">
                        Pedido
                      </p>
                      <p className="mt-1 break-all text-sm font-bold">
                        {pedido.id}
                      </p>
                      <p className="mt-2 text-xs text-neutral-500">
                        {new Date(pedido.createdDate).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <span className="h-fit rounded-full bg-neutral-800 px-4 py-2 text-xs font-bold">
                      {nomesStatus[pedido.status] ?? pedido.status}
                    </span>
                  </div>

                  <div className="grid gap-8 py-6 md:grid-cols-2">
                    <section>
                      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Comprador
                      </h2>
                      <div className="space-y-2 text-sm">
                        <p>{pedido.fullName || "Nome não informado"}</p>
                        <p className="text-neutral-400">
                          {pedido.email || "E-mail não informado"}
                        </p>
                        <p className="text-neutral-400">
                          {pedido.phone || "Telefone não informado"}
                        </p>
                      </div>
                    </section>

                    <section>
                      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Entrega
                      </h2>
                      <div className="space-y-1 text-sm text-neutral-300">
                        <p>
                          {pedido.street || "Rua não informada"}
                          {pedido.number ? `, ${pedido.number}` : ""}
                        </p>
                        {pedido.complement && <p>{pedido.complement}</p>}
                        <p>{pedido.neighborhood}</p>
                        <p>
                          {pedido.city} - {pedido.state}
                        </p>
                        <p>CEP: {pedido.zipCode || "Não informado"}</p>
                      </div>
                    </section>
                  </div>

                  <section className="border-t border-neutral-800 py-6">
                    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Produtos
                    </h2>

                    <div className="space-y-3">
                      {pedido.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between gap-4 text-sm"
                        >
                          <span>
                            {item.name} × {item.quantity}
                          </span>
                          <span className="whitespace-nowrap">
                            {preco(
                              (item.unitPrice * item.quantity) / 100,
                              pedido.currency
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 space-y-2 border-t border-neutral-800 pt-4 text-sm">
                      <p className="flex justify-between text-neutral-400">
                        <span>Subtotal</span>
                        <span>{preco(pedido.subtotal, pedido.currency)}</span>
                      </p>
                      <p className="flex justify-between text-neutral-400">
                        <span>Frete</span>
                        <span>
                          {preco(pedido.shippingCost, pedido.currency)}
                        </span>
                      </p>
                      <p className="flex justify-between pt-2 text-base font-black">
                        <span>Total</span>
                        <span>{preco(pedido.amount, pedido.currency)}</span>
                      </p>
                    </div>
                  </section>

                  <section className="border-t border-neutral-800 py-6">
                    <h2 className="mb-5 text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Histórico do pedido
                    </h2>

                    <div className="space-y-4">
                      {pedido.statusHistory.map((evento, index) => (
                        <div
                          key={`${evento.toStatus}-${evento.createdAt}-${index}`}
                          className="flex gap-3"
                        >
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
                          <div>
                            <p className="text-sm font-bold">
                              {nomesStatus[evento.toStatus] ?? evento.toStatus}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {new Date(evento.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {proximo && (
                    <div className="border-t border-neutral-800 pt-6">
                      <button
                        onClick={() => atualizarStatus(pedido)}
                        disabled={atualizando !== null}
                        className="w-full rounded-lg bg-white px-5 py-4 text-sm font-black uppercase text-black transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {atualizando === pedido.id
                          ? "Atualizando..."
                          : `Avançar para: ${nomesStatus[proximo]}`}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
