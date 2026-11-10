
"use client";

import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCartStore } from "@/src/store";
import { useEffect, useState, FormEvent } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE!,
  {
    developerTools: {
      assistant: {
        enabled: false,
      },
    },
  }
);

const FRETE = 5;

type DadosComprador = {
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type Etapa = "pessoais" | "entrega" | "pagamento";

const dadosIniciais: DadosComprador = {
  fullName: "",
  cpf: "",
  email: "",
  phone: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

function formatarPreco(valor: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

function Campo({
  label,
  name,
  value,
  onChange,
  required = true,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  name: keyof DadosComprador;
  value: string;
  onChange: (name: keyof DadosComprador, value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-black"
      />
    </label>
  );
}

function IndicadorEtapas({ etapa }: { etapa: Etapa }) {
  const etapas = [
    { id: "pessoais", numero: "01", nome: "Pessoais" },
    { id: "entrega", numero: "02", nome: "Entrega" },
    { id: "pagamento", numero: "03", nome: "Pagamento" },
  ];

  const indiceAtual = etapas.findIndex((item) => item.id === etapa);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {etapas.map((item, index) => {
          const concluida = index < indiceAtual;
          const atual = index === indiceAtual;

          return (
            <div
              key={item.id}
              className="flex flex-1 flex-col items-center"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                  atual || concluida
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {concluida ? "✓" : item.numero}
              </div>

              <span
                className={`mt-2 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${
                  atual ? "text-black" : "text-gray-400"
                }`}
              >
                {item.nome}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-1">
        {etapas.map((item, index) => (
          <div
            key={item.id}
            className={`h-1 flex-1 rounded-full ${
              index <= indiceAtual ? "bg-black" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function FormularioPagamento({
  paymentIntentId,
}: {
  paymentIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function finalizarPagamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements || carregando) return;

    setCarregando(true);
    setErro("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pedido-confirmado?payment_intent_id=${encodeURIComponent(paymentIntentId)}`,
        },
        redirect: "if_required",
      });

      if (error) {
        setErro(error.message || "Não foi possível concluir o pagamento.");
        setCarregando(false);
        return;
      }

      if (
        paymentIntent?.status === "succeeded" ||
        paymentIntent?.status === "processing"
      ) {
        window.location.href =
          `/pedido-confirmado?payment_intent_id=${encodeURIComponent(paymentIntent.id)}`;
        return;
      }

      setErro("O pagamento ainda não foi confirmado. Verifique os dados.");
      setCarregando(false);
    } catch {
      setErro("Ocorreu um erro ao processar o pagamento.");
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={finalizarPagamento} className="space-y-6">
      <div>
        <h2 className="text-lg font-bold uppercase text-black">
          Forma de pagamento
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Escolha e informe os dados do pagamento.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {erro && (
        <p
          className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
          role="alert"
        >
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || carregando}
        className="w-full rounded-lg bg-black px-6 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {carregando ? "Processando..." : "Finalizar pagamento"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Pagamento processado com segurança pela Stripe.
      </p>
    </form>
  );
}

export default function Checkout() {
  const cart = useCartStore((state) => state.cart);
  const paymentIntent = useCartStore((state) => state.paymentIntent);
  const setPaymentIntent = useCartStore((state) => state.setPaymentIntent);

  const [comprador, setComprador] =
    useState<DadosComprador>(dadosIniciais);

  const [clientSecret, setClientSecret] = useState("");
  const [checkoutKey, setCheckoutKey] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("pessoais");

  const moeda = "BRL";

  const subtotal = cart.reduce(
    (total, produto) =>
      total + ((produto.price ?? 0) / 100) * (produto.quantity ?? 1),
    0
  );

  const total = subtotal + FRETE;

  function atualizarCampo(
    name: keyof DadosComprador,
    value: string
  ) {
    setComprador((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function voltarParaPessoais() {
    setErro("");
    setEtapa("pessoais");
  }

  function voltarParaEntrega() {
    // Invalida o estado local do pagamento para permitir
    // uma nova preparação caso os dados sejam alterados.
    setClientSecret("");
    setCheckoutKey("");
    setPaymentIntent("");
    setErro("");
    setEtapa("entrega");
  }

  async function consultarCep() {
    const cep = comprador.zipCode.replace(/\D/g, "");

    if (cep.length !== 8) {
      setErro("Informe um CEP válido com 8 números.");
      return;
    }

    setConsultandoCep(true);
    setErro("");

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cep}/json/`
      );

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data = await response.json();

      if (data.erro) {
        throw new Error("CEP não encontrado.");
      }

      setComprador((anterior) => ({
        ...anterior,
        street: data.logradouro || anterior.street,
        neighborhood: data.bairro || anterior.neighborhood,
        city: data.localidade || anterior.city,
        state: data.uf || anterior.state,
      }));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao consultar o CEP."
      );
    } finally {
      setConsultandoCep(false);
    }
  }

  function continuarParaEntrega(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setEtapa("entrega");
  }

  async function continuarParaPagamento(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (carregando) return;

    if (cart.length === 0) {
      setErro("Seu carrinho está vazio.");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const chaveAtual = checkoutKey || crypto.randomUUID();

      if (!checkoutKey) {
        setCheckoutKey(chaveAtual);
      }

      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutKey: chaveAtual,
          items: cart.map((produto) => ({
            id: produto.id,
            quantity: produto.quantity ?? 1,
          })),
          comprador,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível iniciar o pagamento."
        );
      }

      if (!data.paymentIntent?.client_secret || !data.paymentIntent?.id) {
        throw new Error("A Stripe não retornou os dados do pagamento.");
      }

      setPaymentIntent(data.paymentIntent.id);
      setClientSecret(data.paymentIntent.client_secret);
      setEtapa("pagamento");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao preparar o pagamento."
      );
    } finally {
      setCarregando(false);
    }
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#000000",
        colorText: "#111111",
        colorBackground: "#ffffff",
        borderRadius: "8px",
      },
    },
  };

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-2xl font-black uppercase text-black">
          Carrinho vazio
        </h1>
        <p className="mt-3 text-gray-500">
          Adicione produtos antes de finalizar seu pedido.
        </p>
        <a
          href="/"
          className="mt-6 rounded-lg bg-black px-6 py-3 text-sm font-bold uppercase text-white"
        >
          Voltar à loja
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-white px-4 py-10 text-black sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start gap-5">
          <a
            href="/"
            className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-lg border border-black px-4 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-black hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Voltar
          </a>

          <div>
            <p className="text-sm font-bold tracking-wide text-black">
              Agape Streetwear
            </p>

            <h1 className="mt-2 text-3xl font-bold text-black">
              Finalizar pedido.
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Complete as etapas abaixo para concluir sua compra.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <section className="order-2 lg:order-1">
            <IndicadorEtapas etapa={etapa} />

            {etapa === "pessoais" && (
              <form
                onSubmit={continuarParaEntrega}
                className="space-y-8"
              >
                <div>
                  <h2 className="mb-2 text-lg font-black uppercase">
                    01. Dados pessoais
                  </h2>

                  <p className="mb-6 text-sm text-gray-500">
                    Informe seus dados para identificação do pedido.
                  </p>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Campo
                        label="Nome completo"
                        name="fullName"
                        value={comprador.fullName}
                        onChange={atualizarCampo}
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <Campo
                      label="CPF"
                      name="cpf"
                      value={comprador.cpf}
                      onChange={atualizarCampo}
                      placeholder="Somente números"
                      maxLength={14}
                    />

                    <Campo
                      label="Telefone"
                      name="phone"
                      value={comprador.phone}
                      onChange={atualizarCampo}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />

                    <div className="sm:col-span-2">
                      <Campo
                        label="E-mail"
                        name="email"
                        value={comprador.email}
                        onChange={atualizarCampo}
                        placeholder="seuemail@exemplo.com"
                        type="email"
                      />
                    </div>
                  </div>
                </div>

                {erro && (
                  <p
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                    role="alert"
                  >
                    {erro}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-black px-6 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-gray-800"
                >
                  Continuar para entrega
                </button>
              </form>
            )}

            {etapa === "entrega" && (
              <form
                onSubmit={continuarParaPagamento}
                className="space-y-8"
              >
                <div>
                  <h2 className="mb-2 text-lg font-black uppercase">
                    02. Endereço de entrega
                  </h2>

                  <p className="mb-6 text-sm text-gray-500">
                    Informe onde deseja receber seu pedido.
                  </p>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <Campo
                        label="CEP"
                        name="zipCode"
                        value={comprador.zipCode}
                        onChange={atualizarCampo}
                        placeholder="00000-000"
                        maxLength={9}
                      />

                      <button
                        type="button"
                        onClick={consultarCep}
                        disabled={consultandoCep}
                        className="mt-2 text-xs font-bold uppercase text-gray-500 underline underline-offset-4 disabled:opacity-50"
                      >
                        {consultandoCep
                          ? "Consultando..."
                          : "Buscar endereço pelo CEP"}
                      </button>
                    </div>

                    <Campo
                      label="Estado (UF)"
                      name="state"
                      value={comprador.state}
                      onChange={atualizarCampo}
                      placeholder="MS"
                      maxLength={2}
                    />

                    <div className="sm:col-span-2">
                      <Campo
                        label="Rua"
                        name="street"
                        value={comprador.street}
                        onChange={atualizarCampo}
                        placeholder="Nome da rua ou avenida"
                      />
                    </div>

                    <Campo
                      label="Número"
                      name="number"
                      value={comprador.number}
                      onChange={atualizarCampo}
                      placeholder="Número"
                    />

                    <Campo
                      label="Complemento"
                      name="complement"
                      value={comprador.complement}
                      onChange={atualizarCampo}
                      placeholder="Apartamento, bloco..."
                      required={false}
                    />

                    <Campo
                      label="Bairro"
                      name="neighborhood"
                      value={comprador.neighborhood}
                      onChange={atualizarCampo}
                      placeholder="Seu bairro"
                    />

                    <Campo
                      label="Cidade"
                      name="city"
                      value={comprador.city}
                      onChange={atualizarCampo}
                      placeholder="Sua cidade"
                    />
                  </div>
                </div>

                {erro && (
                  <p
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                    role="alert"
                  >
                    {erro}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={voltarParaPessoais}
                    className="w-full rounded-lg border border-gray-300 px-6 py-4 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-gray-100"
                  >
                    Voltar
                  </button>

                  <button
                    type="submit"
                    disabled={carregando || consultandoCep}
                    className="w-full rounded-lg bg-black px-6 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {carregando
                      ? "Preparando pagamento..."
                      : "Continuar para pagamento"}
                  </button>
                </div>
              </form>
            )}

            {etapa === "pagamento" && (
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-5">
                  <h2 className="text-lg font-black uppercase">
                    03. Pagamento
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Confira o resumo e informe os dados do pagamento.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Dados do comprador
                  </h3>

                  <p className="mt-2 text-sm font-semibold">
                    {comprador.fullName}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {comprador.email}
                  </p>

                  <p className="text-xs text-gray-500">
                    {comprador.street}, {comprador.number} — {comprador.city}/{comprador.state}
                  </p>
                </div>

                {clientSecret && paymentIntent && (
                  <Elements
                    key={clientSecret}
                    options={options}
                    stripe={stripePromise}
                  >
                    <FormularioPagamento paymentIntentId={paymentIntent} />
                  </Elements>
                )}

                <button
                  type="button"
                  onClick={voltarParaEntrega}
                  className="w-full rounded-lg border border-gray-300 px-6 py-4 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-gray-100"
                >
                  Voltar para endereço de entrega
                </button>
              </div>
            )}
          </section>

          <aside className="order-1 h-fit rounded-xl bg-gray-50 p-5 sm:p-7 lg:sticky lg:top-8 lg:order-2">
            <h2 className="text-lg font-black uppercase">
              Resumo do pedido
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {cart.length} {cart.length === 1 ? "produto" : "produtos"}
            </p>

            <div className="my-6 space-y-5">
              {cart.map((produto) => (
                <div key={produto.id} className="flex gap-4">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                    <img
                      src={produto.image}
                      alt={produto.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <h3 className="text-sm font-bold">
                      {produto.name}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Quantidade: {produto.quantity ?? 1}
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-sm font-semibold">
                    {formatarPreco(
                      ((produto.price ?? 0) / 100) *
                        (produto.quantity ?? 1),
                      produto.currency || moeda
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatarPreco(subtotal, moeda)}</span>
              </div>

              <div className="flex justify-between text-sm text-gray-500">
                <span>Frete</span>
                <span>{formatarPreco(FRETE, moeda)}</span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-4">
                <span className="font-bold uppercase">Total</span>
                <span className="text-xl font-black">
                  {formatarPreco(total, moeda)}
                </span>
              </div>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-gray-400">
              Entrega com frete fixo de R$ 5,00 por pedido.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
