
"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/src/store";

type Pedido = {
  id: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  amount: number;
  currency: string;
  products: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
};

type RespostaPedido = {
  order: Pedido;
  paymentStatus: string;
};

function formatarPreco(valor: number, moeda = "brl") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda.toUpperCase(),
  }).format(valor);
}

export default function PedidoConfirmado() {
  const clearCart = useCartStore((state) => state.clearCart);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [status, setStatus] = useState("Verificando pagamento...");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let carrinhoLimpo = false;

    async function verificarPagamento(tentativa = 0) {
      const params = new URLSearchParams(window.location.search);
      const paymentIntentId = params.get("payment_intent_id");

      if (!paymentIntentId) {
        setStatus("Não foi possível localizar o pagamento.");
        setCarregando(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/pedido-confirmado?payment_intent_id=${encodeURIComponent(
            paymentIntentId
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Não foi possível localizar o pedido."
          );
        }

        if (cancelado) return;

        const resultado = data as RespostaPedido;

        setPedido(resultado.order);

        const aprovado =
          resultado.paymentStatus === "succeeded" &&
          resultado.order.status === "paid";

        if (aprovado) {
          if (!carrinhoLimpo) {
            clearCart();
            carrinhoLimpo = true;
          }

          setStatus("Pagamento aprovado! Seu pedido foi confirmado.");
          setCarregando(false);
          return;
        }

        if (resultado.paymentStatus === "processing") {
          setStatus("Seu pagamento está sendo processado.");
        } else if (resultado.paymentStatus === "succeeded") {
          setStatus(
            "Pagamento recebido. Estamos confirmando seu pedido."
          );
        } else {
          setStatus("O pagamento ainda não foi confirmado.");
          setCarregando(false);
          return;
        }

        if (tentativa < 5) {
          timeout = setTimeout(() => {
            verificarPagamento(tentativa + 1);
          }, 3000);
        } else {
          setStatus(
            "Seu pagamento ainda está em processamento. Você pode consultar novamente mais tarde."
          );
          setCarregando(false);
        }
      } catch (error) {
        if (cancelado) return;

        setStatus(
          error instanceof Error
            ? error.message
            : "Erro ao verificar o pagamento."
        );

        setCarregando(false);
      }
    }

    verificarPagamento();

    return () => {
      cancelado = true;

      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [clearCart]);

  const aprovado = pedido?.status === "paid";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12 text-black">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 p-6 sm:p-10">
        <div className="text-center">
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
              aprovado
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {carregando ? "…" : aprovado ? "✓" : "!"}
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400">
            Agape Streetwear
          </p>

          <h1 className="mt-3 text-2xl font-black uppercase sm:text-3xl">
            {aprovado ? "Pedido confirmado" : "Status do pedido"}
          </h1>

          <p className="mt-3 text-sm text-gray-500">{status}</p>
        </div>

        {pedido && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">Número do pedido</span>
              <span className="font-bold">{pedido.id}</span>
            </div>

            <div className="my-6 space-y-4">
              {pedido.products.map((produto) => (
                <div
                  key={produto.id}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span>
                    {produto.name} × {produto.quantity}
                  </span>

                  <span className="whitespace-nowrap font-semibold">
                    {formatarPreco(
                      (produto.price * produto.quantity) / 100,
                      pedido.currency
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-5 text-sm">
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
            </div>
          </div>
        )}

        <a
          href="/"
          className="mt-8 block w-full rounded-lg bg-black px-6 py-4 text-center text-sm font-bold uppercase tracking-wider text-white transition hover:bg-gray-800"
        >
          Voltar à loja
        </a>
      </div>
    </main>
  );
}
