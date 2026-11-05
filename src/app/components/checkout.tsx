
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
      <PaymentElement
        id="payment-element"
        options={{ layout: "tabs" }}
      />

      {erro && (
        <p className="text-red-500" role="alert">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || carregando}
        className="w-full rounded-lg bg-black px-6 py-4 text-white font-semibold disabled:opacity-50"
      >
        {carregando ? "Processando..." : "Finalizar pagamento"}
      </button>
    </form>
  );
}

export default function Checkout() {
  const cart = useCartStore((state) => state.cart);
  const paymentIntent = useCartStore((state) => state.paymentIntent);
  const setPaymentIntent = useCartStore((state) => state.setPaymentIntent);

  const [clientSecret, setClientSecret] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

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
            data.error || data.message || "Não foi possível iniciar o pagamento."
          );
        }

        if (!data.paymentIntent?.client_secret) {
          throw new Error("A Stripe não retornou os dados do pagamento.");
        }

        if (ativo) {
          if (!paymentIntent) {
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
      theme: "night",
      labels: "floating",
    },
  };

  if (carregando) {
    return <div><h1>Carregando pagamento...</h1></div>;
  }

  if (erro) {
    return <div><p>{erro}</p></div>;
  }

  return (
    <div>
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <FormularioPagamento />
        </Elements>
      )}
    </div>
  );
}
