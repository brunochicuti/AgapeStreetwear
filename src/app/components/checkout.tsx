
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
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE!
);

function formatarPreco(valor: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

function FormularioPagamento() {
  const stripe = useStripe();
  const elements = useElements();

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function finalizarPagamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) return;

    setCarregando(true);
    setErro("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pedido-confirmado`,
      },
    });

    if (error) {
      setErro(error.message || "Não foi possível concluir o pagamento.");
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={finalizarPagamento} className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-black">
          Forma de pagamento
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Escolha e informe os dados do pagamento.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <PaymentElement
          id="payment-element"
          options={{ layout: "tabs" }}
        />
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

  const isOpen = useCartStore((state) => state.isOpen);
  const toggleCart = useCartStore((state) => state.toggleCart);

  const [clientSecret, setClientSecret] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const moeda = cart[0]?.currency || "BRL";

  const subtotal = cart.reduce(
    (total, produto) =>
      total + (produto.price ?? 0) * (produto.quantity ?? 1),
    0
  );

  // Fecha o carrinho automaticamente ao abrir o checkout.
  useEffect(() => {
    if (isOpen) {
      toggleCart();
    }
  }, [isOpen, toggleCart]);

  useEffect(() => {
    if (cart.length === 0) {
      setCarregando(false);
      setErro("Seu carrinho está vazio.");
      return;
    }

    let ativo = true;

    async function criarPagamento() {
      try {
        setCarregando(true);
        setErro("");

        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: cart,
            payment_intent_id: paymentIntent || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Não foi possível iniciar o pagamento."
          );
        }

        if (!data.paymentIntent?.client_secret) {
          throw new Error("A Stripe não retornou os dados do pagamento.");
        }

        if (ativo) {
          if (paymentIntent !== data.paymentIntent.id) {
            setPaymentIntent(data.paymentIntent.id);
          }

          setClientSecret(data.paymentIntent.client_secret);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao carregar o pagamento."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    criarPagamento();

    return () => {
      ativo = false;
    };
  }, [cart, paymentIntent, setPaymentIntent]);

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

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
          Preparando seu pagamento...
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-2xl font-black uppercase text-black">
          Não foi possível continuar
        </h1>

        <p className="mt-3 text-gray-500">{erro}</p>

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
        <div className="mb-10 border-b border-gray-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400">
            Agape Streetwear
          </p>

          <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Finalizar pedido<span className="text-gray-400">.</span>
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Revise seu pedido e conclua seu pagamento.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <section className="order-2 lg:order-1">
            {clientSecret && (
              <Elements options={options} stripe={stripePromise}>
                <FormularioPagamento />
              </Elements>
            )}
          </section>

          <aside className="order-1 h-fit rounded-xl bg-gray-50 p-5 sm:p-7 lg:order-2">
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
                      (produto.price ?? 0) * (produto.quantity ?? 1),
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
                <span>A definir</span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-4">
                <span className="font-bold uppercase">Total</span>
                <span className="text-xl font-black">
                  {formatarPreco(subtotal, moeda)}
                </span>
              </div>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-gray-400">
              O valor do frete, se aplicável, deverá ser confirmado antes da
              conclusão do pedido.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
