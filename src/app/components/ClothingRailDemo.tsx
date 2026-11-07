"use client";

import { useEffect, useState } from "react";
import ClothingRailHero from "./ui/product-rail-gallery";
import type { RailGarment } from "./ui/product-rail-gallery";
import { formatPrice } from "@/src/lib/utils";
import { ProductType } from "@/src/types/ProductType";

export default function ClothingRailHeroDemo({ autoplay = true }: { autoplay?: boolean }) {
  const [items, setItems] = useState<RailGarment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStripeProducts() {
      try {
        const res = await fetch("/api/products");
        const products: any[] = await res.json(); // Usamos any[] ou fazemos o cast abaixo para evitar o erro do TS

        if (Array.isArray(products)) {
          const mappedItems: RailGarment[] = products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description || "",
            // Adicionado (product as any) para o TypeScript não reclamar dos campos extras da Stripe
            kind: (product as any).metadata?.kind || "tee",
            color: (product as any).metadata?.color || "#EFEBE2",
            tag: formatPrice(product.price),
            image: product.image,
            backImage: (product as any).metadata?.backImage,
            sideImage: (product as any).metadata?.sideImage,
          }));

          setItems(mappedItems);
        }
      } catch (error) {
        console.error("Erro ao carregar produtos da Stripe:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStripeProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-black text-white">
        <p className="text-sm text-neutral-400">A carregar produtos da Stripe...</p>
      </div>
    );
  }

  return (
    <div 
      data-rail-demo 
      className="relative flex min-h-svh w-full items-center justify-center overflow-hidden text-foreground"
      style={{ background: "radial-gradient(circle at 50% 25%, #1a1a1c 0%, #0d0d0f 60%, #000000 100%)" }}
    >
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-neutral-800/20 blur-[150px]" 
      />

      <ClothingRailHero
        items={items}
        hanger="none"
        eyebrow="Stripe Catalog"
        heading="Arara de Produtos Reais"
        caption="Passe o cursor e clique nas peças para ver os detalhes."
        autoplay={autoplay}
        action={
          <button type="button" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
            Shop the edit
          </button>
        }
      />
    </div>
  );
}