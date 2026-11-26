
"use client";

import ClothingRailHero from "./ui/product-rail-gallery";
import type { RailGarment } from "./ui/product-rail-gallery";
import { ProductType } from "@/src/types/ProductType";

type ImagemProduto = {
  stripeProductId: string;
  angle: "FRENTE" | "LADO" | "COSTAS";
  url: string;
};

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function identificarTipo(
  nome: string
): NonNullable<RailGarment["kind"]> {
  const nomeNormalizado = normalizar(nome);

  if (nomeNormalizado.includes("moletom")) return "hoodie";
  if (nomeNormalizado.includes("jaqueta")) return "jacket";
  if (nomeNormalizado.includes("casaco")) return "coat";
  if (
    nomeNormalizado.includes("tricot") ||
    nomeNormalizado.includes("malha")
  ) {
    return "knit";
  }
  if (nomeNormalizado.includes("camisa social")) return "shirt";

  return "tee";
}

export default function ClothingRailHeroDemo({
  products = [],
  images = [],
  autoplay = true,
}: {
  products?: ProductType[];
  images?: ImagemProduto[];
  autoplay?: boolean;
}) {
  const items: RailGarment[] = products.flatMap((product) => {
    const imagensDoProduto = images.filter(
      (imagem) => imagem.stripeProductId === product.id
    );

    const buscarImagem = (angle: ImagemProduto["angle"]) =>
      imagensDoProduto.find((imagem) => imagem.angle === angle)?.url;

    const camisaLegada =
      product.id === "prod_VaAw48z5A45rud" ||
      normalizar(product.name).includes("camis");

    const imagemFrente =
      buscarImagem("FRENTE") ||
      (camisaLegada
        ? "/images/Camiseta_cabide_frente.png"
        : product.image || undefined);

    if (!imagemFrente) return [];

    return [
      {
        id: product.id,
        name: product.name,
        description:
          product.description ||
          "Peça exclusiva da Agape Streetwear.",
        kind: identificarTipo(product.name),
        color: "#EFEBE2",
        tag: product.etiqueta ?? undefined,
        image: imagemFrente,
        backImage:
          buscarImagem("COSTAS") ||
          (camisaLegada
            ? "/images/camiseta_cabide_costas.png"
            : undefined),
        sideImage:
          buscarImagem("LADO") ||
          (camisaLegada
            ? "/images/camiseta_cabide_lado.png"
            : undefined),
        product,
      },
    ];
  });

  return (
    <div
      data-rail-demo
      className="relative flex min-h-[calc(100svh)] w-full items-center justify-center overflow-hidden bg-[#F5F1E8] text-foreground"
    >
      <ClothingRailHero
        items={items}
        hanger="none"
        eyebrow="Agape Streetwear"
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
