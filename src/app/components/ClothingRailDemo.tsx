"use client";

import ClothingRailHero from "./ui/product-rail-gallery";
import type { RailGarment } from "./ui/product-rail-gallery";
import { formatPrice } from "@/src/lib/utils";

export default function ClothingRailHeroDemo({ autoplay = true }: { autoplay?: boolean }) {
  // Definimos os produtos diretamente aqui, usando as imagens que puseste na pasta public/images/
  const items: RailGarment[] = [
    {
      id: "prod_camisa_agape",
      name: "Camisa Ágape",
      description: "Camisa exclusiva com visual frente, costas e lado.",
      kind: "tee",
      color: "#EFEBE2",
      tag: formatPrice(150), // Podes ajustar o preço aqui
      image: "/images/camisa_agape_frente.png", // Substitui pelo nome exato da tua foto da frente na pasta public/images/
      backImage: "/images/camisa_agape_costas.png",
      sideImage: "/images/camisa_agape_lado.png",
    },
  ];

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
        eyebrow="Loja Ágape"
        heading="Arara de Produtos"
        caption="Passe o cursor e clique na peça para ver os detalhes e as diferentes vistas."
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