"use client";

import { useMemo } from "react";
import ClothingRailHero, {
  type RailGarment,
}from "@/src/app/components/ui/product-rail-gallery";
import type { ProductType } from "@/src/types/ProductType";
import { useCartStore } from "@/src/store";

type FioProps = {
  products: ProductType[];
};

function formatarPreco(preco: number | null, moeda = "brl") {
  if (preco === null) return "Preço indisponível";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda.toUpperCase(),
  }).format(preco / 100);
}

export default function Fio({ products }: FioProps) {
  const addProduct = useCartStore((state) => state.addProduct);

  const produtosComImagem = useMemo(
    () => products.filter((produto) => Boolean(produto.image)),
    [products]
  );

  const itens: RailGarment[] = useMemo(
    () =>
      produtosComImagem.map((produto) => ({
        id: produto.id,
        name: produto.name,
        description: produto.description ?? undefined,
        image: produto.image,
        tag: formatarPreco(produto.price, produto.currency || "brl"),
        details: [formatarPreco(produto.price, produto.currency || "brl")],
      })),
    [produtosComImagem]
  );

  if (itens.length === 0) {
    return (
      <section className="flex min-h-[280px] items-center justify-center bg-[#f5f3ee] px-6 text-center text-sm text-[#716b62]">
        Nenhuma peça com imagem está disponível no momento.
      </section>
    );
  }

  function adicionarNaSacola(item: RailGarment) {
    const produto = produtosComImagem.find((atual) => atual.id === item.id);
    if (produto) addProduct(produto);
  }

  return (
    <ClothingRailHero
      items={itens}
      eyebrow="AGAPE STREETWEAR · COLEÇÃO"
      heading="Encontre sua próxima peça"
      caption="Passe pelas peças, escolha uma e explore os detalhes."
      hanger="matte"
      autoplay={false}
      labels={{ front: "Frente", back: "Costas", close: "Fechar", show: "Mostrar" }}
      onAddToCart={adicionarNaSacola}
      className="bg-[#f5f3ee] text-[#242321]"
    />
  );
}
