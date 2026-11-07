"use client";
import { Space_Grotesk } from "next/font/google";
import { useCartStore } from "@/src/store";
import { ProductType } from "@/src/types/ProductType";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
});

export default function Product({ product }: { product: ProductType }) {
  const { addProduct } = useCartStore();
  const esgotado = product.etiqueta === "ESGOTADO";

  return (
    <button
      type="button"
      disabled={esgotado}
      onClick={() => {
        if (!esgotado) addProduct(product);
      }}
      className={`${spaceGrotesk.className} rounded-md p-3.5 py-2.5 text-center font-bold uppercase tracking-[0.1em] ${
        esgotado
          ? "cursor-not-allowed bg-neutral-600 text-white/70"
          : "bg-white text-black"
      }`}
    >
      {esgotado ? "Esgotado" : "Adicionar à sacola"}
    </button>
  );
}