"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE!
);
export default function PedidoConfirmado() {
  const [status, setStatus] = useState("Verificando pagamento...");

  useEffect(() => {
    async function verificarPagamento() {
      const params = new URLSearchParams(window.location.search);
      const clientSecret = params.get("payment_intent_client_secret");

      if (!clientSecret) {
        setStatus("Não foi possível localizar o pagamento.");
        return;
      }

      const stripe = await stripePromise;

      if (!stripe) {
        setStatus("Não foi possível conectar ao sistema de pagamento.");
        return;
      }

      const { paymentIntent, error } =
        await stripe.retrievePaymentIntent(clientSecret);

      if (error || !paymentIntent) {
        setStatus("Não foi possível verificar o pagamento.");
        return;
      }

      if (paymentIntent.status === "succeeded") {
        setStatus("Pagamento aprovado! Seu pedido foi confirmado.");
      } else if (paymentIntent.status === "processing") {
        setStatus("Seu pagamento está sendo processado.");
      } else {
        setStatus("O pagamento ainda não foi confirmado.");
      }
    }

    verificarPagamento();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">
          Pedido Agape Streetwear
        </h1>
        <p>{status}</p>
      </div>
    </main>
  );
}