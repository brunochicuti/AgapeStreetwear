
"use client";

import { useCallback, useEffect, useState } from "react";
import BibliotecaImagens from "./components/BibliotecaImagens";

type Produto = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  image: string | null;
  color: string | null;
  size: string | null;
};

type EventoStatus = {
  fromStatus: string | null;
  toStatus: string;
  source: string;
  createdAt: string;
};

type Pedido = {
  id: string;
  status: string;
  fulfillmentStatus: string;
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


type SolicitacaoPrivacidade = {
  id: string;
  userId: number | null;
  type: string;
  source: string;
  requesterName: string | null;
  requesterEmail: string | null;
  description: string | null;
  status: string;
  receivedAt: string;
  completedAt: string | null;
  decision: string | null;
  justification: string | null;
  processedBy: string | null;
  user: {
    deletionRequestedAt: string | null;
  } | null;
};


const proximoStatus: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "shipped",
  shipped: "delivered",
};

const nomesPagamento: Record<string, string> = {
  pending: "Pagamento pendente",
  paid: "Pagamento aprovado",
  failed: "Pagamento não aprovado",
  canceled: "Cancelado",
  review_required: "Pagamento em análise",
};

const nomesEntrega: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  pending: "Aguardando preparação",
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
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPrivacidade[]>([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [atualizandoSolicitacao, setAtualizandoSolicitacao] = useState<string | null>(null);
  const [erroPrivacidade, setErroPrivacidade] = useState("");
  const [nomeSolicitante, setNomeSolicitante] = useState("");
  const [emailSolicitante, setEmailSolicitante] = useState("");
  const [descricaoSolicitacao, setDescricaoSolicitacao] = useState("");
  const [tipoSolicitacao, setTipoSolicitacao] = useState("ACESSO");
  const [fonteSolicitacao, setFonteSolicitacao] = useState("EMAIL");
  const [salvandoSolicitacao, setSalvandoSolicitacao] = useState(false);

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

    const carregarSolicitacoes = useCallback(async () => {
    try {
      setErroPrivacidade("");

      const resposta = await fetch(
        "/api/admin/solicitacoes-privacidade",
        { cache: "no-store" }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error || "Não foi possível consultar as solicitações."
        );
      }

      setSolicitacoes(dados.solicitacoes ?? []);
    } catch (error) {
      setErroPrivacidade(
        error instanceof Error
          ? error.message
          : "Erro ao consultar solicitações."
      );
    } finally {
      setCarregandoSolicitacoes(false);
    }
  }, []);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  useEffect(() => {
  carregarSolicitacoes();
}, [carregarSolicitacoes]);

  async function atualizarStatus(pedido: Pedido) {
    const novoStatus = proximoStatus[pedido.fulfillmentStatus];

    if (!novoStatus) return;

    const confirmar = window.confirm(
      `Deseja alterar o pedido ${pedido.id} para "${nomesEntrega[novoStatus]}"?`
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
          body: JSON.stringify({ fulfillmentStatus: novoStatus }),
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


  async function atualizarSolicitacao(
    solicitacao: SolicitacaoPrivacidade,
    novoStatus: string
  ) {
    let decision = "";
    let justification = "";

    if (novoStatus !== "EM_ANALISE") {
      const decisaoInformada = window.prompt(
        "Registre a decisão tomada para esta solicitação:"
      );

      if (!decisaoInformada?.trim()) return;

      const justificativaInformada = window.prompt(
        "Explique a justificativa da decisão:"
      );

      if (!justificativaInformada?.trim()) return;

      decision = decisaoInformada.trim();
      justification = justificativaInformada.trim();
    }

    try {
      setAtualizandoSolicitacao(solicitacao.id);
      setErroPrivacidade("");

      const resposta = await fetch(
        "/api/admin/solicitacoes-privacidade",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: solicitacao.id,
            status: novoStatus,
            decision,
            justification,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error || "Não foi possível atualizar a solicitação."
        );
      }

      await carregarSolicitacoes();
    } catch (error) {
      setErroPrivacidade(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar a solicitação."
      );
    } finally {
      setAtualizandoSolicitacao(null);
    }
  }


  async function cadastrarSolicitacao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSalvandoSolicitacao(true);
      setErroPrivacidade("");

      const resposta = await fetch(
        "/api/admin/solicitacoes-privacidade",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requesterName: nomeSolicitante,
            requesterEmail: emailSolicitante,
            description: descricaoSolicitacao,
            type: tipoSolicitacao,
            source: fonteSolicitacao,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error || "Não foi possível cadastrar a solicitação."
        );
      }

      setNomeSolicitante("");
      setEmailSolicitante("");
      setDescricaoSolicitacao("");
      setTipoSolicitacao("ACESSO");
      setFonteSolicitacao("EMAIL");

      await carregarSolicitacoes();
    } catch (error) {
      setErroPrivacidade(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar solicitação."
      );
    } finally {
      setSalvandoSolicitacao(false);
    }
  }



  return (
    <main className="min-h-screen bg-neutral-950 px-6 pt-32 pb-10 text-white">
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


        <section className="mb-10 rounded-xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase">
                Solicitações de privacidade
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                Acompanhe e analise solicitações de titulares de dados.
              </p>
            </div>

            <button
              onClick={carregarSolicitacoes}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-bold transition hover:bg-neutral-800"
            >
              Atualizar solicitações
            </button>
          </div>


          <form
            onSubmit={cadastrarSolicitacao}
            className="mb-8 rounded-xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6"
          >
            <h3 className="mb-5 text-sm font-black uppercase tracking-wider">
              Registrar nova solicitação
            </h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-neutral-300">
                Nome do solicitante
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={nomeSolicitante}
                  onChange={(e) => setNomeSolicitante(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                  placeholder="Nome completo"
                />
              </label>

              <label className="text-sm text-neutral-300">
                E-mail para contato
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={emailSolicitante}
                  onChange={(e) => setEmailSolicitante(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                  placeholder="cliente@email.com"
                />
              </label>

              <label className="text-sm text-neutral-300">
                Tipo de solicitação
                <select
                  value={tipoSolicitacao}
                  onChange={(e) => setTipoSolicitacao(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                >
                  <option value="ACESSO">Acesso aos dados</option>
                  <option value="CORRECAO">Correção de dados</option>
                  <option value="EXCLUSAO">Exclusão de dados</option>
                  <option value="ANONIMIZACAO">Anonimização</option>
                  <option value="BLOQUEIO">Bloqueio de dados</option>
                  <option value="PORTABILIDADE">Portabilidade</option>
                  <option value="INFORMACOES_COMPARTILHAMENTO">
                    Informações sobre compartilhamento
                  </option>
                  <option value="REVOGACAO_CONSENTIMENTO">
                    Revogação de consentimento
                  </option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>

              <label className="text-sm text-neutral-300">
                Canal de recebimento
                <select
                  value={fonteSolicitacao}
                  onChange={(e) => setFonteSolicitacao(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                >
                  <option value="EMAIL">E-mail</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="OUTRO">Outro canal</option>
                </select>
              </label>

              <label className="text-sm text-neutral-300 sm:col-span-2">
                Descrição da solicitação
                <textarea
                  required
                  maxLength={3000}
                  rows={4}
                  value={descricaoSolicitacao}
                  onChange={(e) => setDescricaoSolicitacao(e.target.value)}
                  className="mt-2 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                  placeholder="Descreva o pedido recebido e as informações relevantes..."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={salvandoSolicitacao}
              className="mt-5 rounded-lg bg-white px-6 py-3 text-sm font-bold uppercase text-black transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvandoSolicitacao
                ? "Registrando..."
                : "Registrar solicitação"}
            </button>
          </form>


          {erroPrivacidade && (
            <div className="mb-5 rounded-lg border border-red-900 bg-red-950 p-4 text-sm text-red-300">
              {erroPrivacidade}
            </div>
          )}

          {carregandoSolicitacoes ? (
            <p className="py-8 text-center text-neutral-400">
              Carregando solicitações...
            </p>
          ) : solicitacoes.length === 0 ? (
            <p className="py-8 text-center text-neutral-500">
              Nenhuma solicitação de privacidade registrada.
            </p>
          ) : (
            <div className="space-y-4">
              {solicitacoes.map((solicitacao) => (
                <article
                  key={solicitacao.id}
                  className="rounded-lg border border-neutral-800 p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        {solicitacao.type === "EXCLUSAO_CONTA"
                          ? "Exclusão de conta"
                          : solicitacao.type}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Recebida em:{" "}
                        {new Date(solicitacao.receivedAt).toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Origem: {solicitacao.source}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Identificador interno: {solicitacao.userId ?? "Não vinculado"}
                      </p>
                    </div>

                    <span className="h-fit rounded-full bg-neutral-800 px-3 py-2 text-xs font-bold">
                      {solicitacao.status}
                    </span>
                  </div>


                  {(solicitacao.requesterName ||
                    solicitacao.requesterEmail ||
                    solicitacao.description) && (
                    <div className="mt-4 space-y-2 border-t border-neutral-800 pt-4 text-sm">
                      {solicitacao.requesterName && (
                        <p className="text-neutral-300">
                          <span className="font-bold">Solicitante:</span>{" "}
                          {solicitacao.requesterName}
                        </p>
                      )}

                      {solicitacao.requesterEmail && (
                        <p className="text-neutral-300">
                          <span className="font-bold">E-mail:</span>{" "}
                          {solicitacao.requesterEmail}
                        </p>
                      )}

                      {solicitacao.description && (
                        <div>
                          <p className="mb-1 font-bold text-neutral-300">
                            Descrição:
                          </p>
                          <p className="whitespace-pre-wrap text-neutral-400">
                            {solicitacao.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}


                  {solicitacao.decision && (
                    <div className="mt-4 border-t border-neutral-800 pt-4 text-sm">
                      <p className="font-bold text-neutral-300">
                        Decisão: {solicitacao.decision}
                      </p>
                      <p className="mt-2 text-neutral-400">
                        Justificativa: {solicitacao.justification}
                      </p>
                      {solicitacao.completedAt && (
                        <p className="mt-2 text-xs text-neutral-500">
                          Processada em:{" "}
                          {new Date(solicitacao.completedAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {solicitacao.status === "PENDENTE" && (
                      <button
                        onClick={() =>
                          atualizarSolicitacao(solicitacao, "EM_ANALISE")
                        }
                        disabled={atualizandoSolicitacao !== null}
                        className="rounded-lg border border-neutral-600 px-4 py-3 text-xs font-bold transition hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {atualizandoSolicitacao === solicitacao.id
                          ? "Atualizando..."
                          : "Iniciar análise"}
                      </button>
                    )}

                    {solicitacao.status === "EM_ANALISE" && (
                      <>
                        {["CONCLUIDA", "PARCIAL", "INDEFERIDA"].map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              atualizarSolicitacao(solicitacao, status)
                            }
                            disabled={atualizandoSolicitacao !== null}
                            className="rounded-lg border border-neutral-600 px-4 py-3 text-xs font-bold transition hover:bg-neutral-800 disabled:opacity-50"
                          >
                            {atualizandoSolicitacao === solicitacao.id
                              ? "Atualizando..."
                              : status === "CONCLUIDA"
                                ? "Concluir"
                                : status === "PARCIAL"
                                  ? "Atender parcialmente"
                                  : "Indeferir"}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>


        <section className="mb-10 rounded-xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8">
          <BibliotecaImagens />
        </section>


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
              const proximo = proximoStatus[pedido.fulfillmentStatus];
              const historicoEntrega = pedido.statusHistory.filter(
                (evento) => evento.source === "admin"
              );

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

                    <div className="flex flex-col gap-2 text-right">
                      <span className="rounded-full bg-neutral-800 px-4 py-2 text-xs font-bold">
                        Pagamento: {nomesPagamento[pedido.status] ?? pedido.status}
                      </span>
                      <span className="rounded-full bg-neutral-800 px-4 py-2 text-xs font-bold">
                        Entrega: {nomesEntrega[pedido.fulfillmentStatus] ?? pedido.fulfillmentStatus}
                      </span>
                    </div>
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
                    <div>
                      <p className="font-medium">{item.name}</p>

                      {item.color && (
                        <p className="mt-1 text-xs text-neutral-400">
                          Cor: {item.color}
                        </p>
                      )}

                      {item.size && (
                        <p className="mt-1 text-xs text-neutral-400">
                          Tamanho: {item.size}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-neutral-400">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
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
                      Histórico da entrega
                    </h2>

                    <div className="space-y-4">
                      {historicoEntrega.length === 0 ? (
                        <p className="text-sm text-neutral-500">
                          Nenhuma atualização de entrega registrada.
                        </p>
                      ) : (
                        historicoEntrega.map((evento, index) => (
                          <div
                            key={`${evento.toStatus}-${evento.createdAt}-${index}`}
                            className="flex gap-3"
                          >
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
                            <div>
                              <p className="text-sm font-bold">
                                {nomesEntrega[evento.toStatus] ?? evento.toStatus}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {new Date(evento.createdAt).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {proximo && pedido.status === "paid" && (
                    <div className="border-t border-neutral-800 pt-6">
                      <button
                        onClick={() => atualizarStatus(pedido)}
                        disabled={atualizando !== null}
                        className="w-full rounded-lg bg-white px-5 py-4 text-sm font-black uppercase text-black transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {atualizando === pedido.id
                          ? "Atualizando..."
                          : `Avançar para: ${nomesEntrega[proximo]}`}
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
