"use client";

import * as React from "react";
import ClothingRailHero from "./ui/product-rail-gallery";
import type { RailGarment } from "./ui/product-rail-gallery";
import { ProductType } from "@/src/types/ProductType";
import { useCartStore } from "@/src/store";

// true  = a foto da Stripe já tem o cabide. false = o componente desenha um cabide.
const CABIDE_NA_FOTO = true;

export default function ClosetAgape({ products }: { products: ProductType[] }) {
  const addProduct = useCartStore((state) => state.addProduct);

  // Converte os produtos da Stripe no formato da arara.
  const itens = React.useMemo<RailGarment[]>(
    () =>
      products
        .filter((produto) => Boolean(produto.image))
        .map((produto) => ({
          id: produto.id,
          name: produto.name,
          description: produto.description ?? undefined,
          image: produto.image,
          tag: produto.etiqueta ?? undefined,
          soldOut: produto.etiqueta === "ESGOTADO",
        })),
    [products]
  );

  const porId = React.useMemo(
    () => new Map(products.map((produto) => [produto.id, produto])),
    [products]
  );

  if (itens.length === 0) return null;

  return (
    <div
      className="relative flex min-h-svh w-full items-center justify-center overflow-hidden text-foreground"
      style={{ background: "radial-gradient(circle at 50% 25%, #1a1a1c 0%, #0d0d0f 60%, #000000 100%)" }}
    >
      <ClothingRailHero
        items={itens}
        hanger={CABIDE_NA_FOTO ? "none" : "matte"}
        eyebrow="Loja Ágape"
        heading="Arara de Produtos"
        caption="Passe o cursor e clique na peça para ver os detalhes."
        autoplay
        onAddToCart={(item) => {
          const produto = porId.get(item.id);
          if (produto && produto.etiqueta !== "ESGOTADO") addProduct(produto);
        }}
        action={
          <a
            href="#todas"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md"
          >
            Ver todas as peças
          </a>
        }
      />
    </div>
  );
}