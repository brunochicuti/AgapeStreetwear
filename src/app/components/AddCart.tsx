
"use client";

import { useState } from "react";
import { Space_Grotesk } from "next/font/google";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/src/store";
import { ProductType } from "@/src/types/ProductType";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
});

export default function AddCart({ product }: { product: ProductType }) {
  const [quantity, setQuantity] = useState(1);
  const { addProduct, toggleCart } = useCartStore();

  const esgotado = product.etiqueta === "ESGOTADO";

  return (
    <div className={`${spaceGrotesk.className} flex flex-col gap-5`}>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-white">
          Quantidade
        </span>

        <div className="flex w-fit items-center rounded-md border border-white/20">
          <button
            type="button"
            disabled={esgotado || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="p-3 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Diminuir quantidade"
          >
            <Minus size={17} />
          </button>

          <span className="min-w-10 text-center text-white">
            {quantity}
          </span>

          <button
            type="button"
            disabled={esgotado}
            onClick={() => setQuantity((q) => q + 1)}
            className="p-3 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Aumentar quantidade"
          >
            <Plus size={17} />
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={esgotado}
        onClick={() => {
          if (esgotado) return;

          addProduct(product, quantity);
          toggleCart();
        }}
        className={`rounded-md p-3.5 py-3 text-center font-bold uppercase tracking-[0.1em] transition ${
          esgotado
            ? "cursor-not-allowed bg-neutral-600 text-white/70"
            : "bg-white text-black hover:bg-neutral-200"
        }`}
      >
        {esgotado ? "Esgotado" : "Adicionar à sacola"}
      </button>
    </div>
  );
}
