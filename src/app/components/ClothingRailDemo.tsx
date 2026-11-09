"use client";

import ClothingRailHero from "./ui/product-rail-gallery";
import type { RailGarment } from "./ui/product-rail-gallery";
import { ProductType } from "@/src/types/ProductType";

// Normaliza o nome para comparar ("Camisa Ágape" = "camisa agape").
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export default function ClothingRailHeroDemo({
  products = [],
  autoplay = true,
}: {
  products?: ProductType[];
  autoplay?: boolean;
}) {
  // Acha o produto da Stripe que corresponde a uma peça daqui (pelo id ou pelo nome).
  const achar = (id: string, nome: string) =>
    products.find((p) => p.id === id) ??
    products.find((p) => normalizar(p.name) === normalizar(nome));

  const camisa = achar("prod_VaAw48z5A45rud", "camisa");

  // Peças fixas daqui (com as fotos de frente, costas e lado em public/images/).
  // A etiqueta vem da Stripe: NOVO, ÚLTIMAS UNIDADES, ESGOTADO ou MAIS VENDIDO.
  const items: RailGarment[] = [
    {
      id: "prod_camisa_agape",
      name: "Camisa Ágape",
      description: "Camisa exclusiva com visual frente, costas e lado.",
      kind: "tee",
      color: "#EFEBE2",
      tag: camisa?.etiqueta ?? undefined,
      image: "/images/camisa_agape_frente.png",
      backImage: "/images/camisa_agape_costas.png",
      sideImage: "/images/camisa_agape_lado.png",
      product: camisa,
    },
  ];

return (
      <div
        data-rail-demo
        className="relative flex min-h-[calc(100svh)] w-full items-center justify-center overflow-hidden bg-[#F5F1E8] text-foreground"
      >
      <ClothingRailHero
        items={items}
        hanger="wood"
        eyebrow="Loja Ágape"
        heading="Arara de Produtos"
        caption="Passe o cursor e clique na peça para ver os detalhes e as diferentes vistas."
        autoplay={autoplay}
        action={
            <button
              type="button"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm"
            >
              Ver coleção
            </button>
        }
      />
      </div>
    );
  }