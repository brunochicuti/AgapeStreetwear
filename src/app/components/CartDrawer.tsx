
"use client";

import Image from "next/image";
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import { useCartStore } from "@/src/store";
import { formatPrice } from "@/src/lib/utils";
import CheckoutButton from "./CheckoutButton";

export default function CartDrawer() {
  const useStore = useCartStore();

  const cart = useStore.cart;

const quantidadeTotal = cart.reduce(
  (total, item) => total + (item.quantity ?? 1),
  0
);

const subtotal = cart.reduce(
  (total, item) => total + (item.price ?? 0) * (item.quantity ?? 1),
  0
)

  const fecharCarrinho = () => {
    useStore.toggleCart();
  };

  return (
    <div
      onClick={fecharCarrinho}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Seu carrinho de compras"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[520px] flex-col bg-[#faf9f6] text-[#24231f] shadow-2xl animate-in slide-in-from-right duration-300 sm:w-[90%]"
      >
        {/* Cabeçalho */}
        <header className="flex items-center justify-between border-b border-[#e8e5df] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eeece6]">
              <ShoppingBag size={20} strokeWidth={1.6} />
            </div>

            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Sua sacola
              </h2>
              <p className="mt-0.5 text-xs text-[#858077]">
                {quantidadeTotal}{" "}
                {quantidadeTotal === 1
                  ? "item selecionado"
                  : "itens selecionados"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fecharCarrinho}
            aria-label="Fechar carrinho"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e5df] transition hover:bg-[#eeece6]"
          >
            <X size={19} strokeWidth={1.7} />
          </button>
        </header>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7">
          {cart.length === 0 ? (
            <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#eeece6]">
                <ShoppingCart
                  size={36}
                  strokeWidth={1.2}
                  className="text-[#716c62]"
                />
              </div>

              <h3 className="text-xl font-medium tracking-tight">
                Sua sacola está vazia
              </h3>

              <p className="mt-2 max-w-[260px] text-sm leading-6 text-[#858077]">
                Descubra nossas peças e encontre algo que combine com você.
              </p>

              <button
                type="button"
                onClick={fecharCarrinho}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#24231f] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#45423c]"
              >
                Explorar coleção
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#858077]">
                  Seus produtos
                </p>

                <span className="text-xs text-[#858077]">
                  {cart.length} {cart.length === 1 ? "produto" : "produtos"}
                </span>
              </div>

              <div className="divide-y divide-[#e8e5df]">
                {cart.map((item) => (
                  <article
                    key={item.id}
                    className="flex gap-4 py-5 first:pt-0"
                  >
                    {/* Imagem */}
                    <div className="relative h-[124px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-[#eeece6] sm:h-[140px] sm:w-[112px]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="112px"
                        className="object-contain p-2"
                      />
                    </div>

                    {/* Informações */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-medium leading-5 sm:text-[15px]">
                          {item.name}
                        </h3>

                        <button
                          type="button"
                          onClick={() => useStore.removeProduct(item)}
                          aria-label={`Remover ${item.name} do carrinho`}
                          title="Remover produto"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#918a80] transition hover:bg-[#eae6df] hover:text-red-700"
                        >
                          <Trash2 size={16} strokeWidth={1.6} />
                        </button>
                      </div>

                      <p className="mt-2 text-sm font-semibold">
                        {formatPrice((item.price ?? 0) * (item.quantity ?? 1))}
                      </p>

                      <p className="mt-1 text-xs text-[#858077]">
                        {item.price !== null
                        ? `${formatPrice(item.price)} por unidade`
                        : "Preço indisponível"}
                      </p>

                      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <div className="flex h-9 items-center rounded-full border border-[#e2ded6] bg-white">
                          <button
                            type="button"
                            onClick={() => useStore.removeProduct(item)}
                            aria-label={`Diminuir quantidade de ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-l-full transition hover:bg-[#eeece6]"
                          >
                            <Minus size={14} />
                          </button>

                          <span className="min-w-7 text-center text-sm tabular-nums">
                            {item.quantity ?? 1}
                          </span>

                          <button
                            type="button"
                            onClick={() => useStore.addProduct(item)}
                            aria-label={`Aumentar quantidade de ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-r-full transition hover:bg-[#eeece6]"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <button
                type="button"
                onClick={fecharCarrinho}
                className="mb-6 mt-5 inline-flex items-center gap-2 py-2 text-sm text-[#716c62] transition hover:text-black"
              >
                <ArrowLeft size={15} />
                Continuar comprando
              </button>
            </>
          )}
        </div>

        {/* Resumo e finalização */}
        {cart.length > 0 && (
          <footer className="border-t border-[#e8e5df] bg-white px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#777168]">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-[#777168]">Entrega</span>
                <span className="text-xs text-[#858077]">
                  Calculada na finalização
                </span>
              </div>

              <div className="my-1 border-t border-dashed border-[#e2ded6]" />

              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold">
                  Total parcial
                </span>
                <span className="text-xl font-semibold tracking-tight">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </div>

            <CheckoutButton totalPrice={subtotal} />

            <p className="mt-3 text-center text-[11px] leading-5 text-[#928b81]">
              Os valores de entrega serão apresentados na finalização.
            </p>
          </footer>
        )}
      </aside>
    </div>
  );
}
