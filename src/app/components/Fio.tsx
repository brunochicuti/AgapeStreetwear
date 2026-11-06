
"use client";

import { useRef, useState } from "react";
import { ProductType } from "@/src/types/ProductType";
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

function Cabide({ id }: { id: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      className="block h-auto w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F8F8F8" />
          <stop offset="28%" stopColor="#777777" />
          <stop offset="48%" stopColor="#FDFDFD" />
          <stop offset="72%" stopColor="#858585" />
          <stop offset="100%" stopColor="#DCDCDC" />
        </linearGradient>
      </defs>

      <g
        fill="none"
        stroke={`url(#metal-${id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M60 5 C60 0 67 0 69 5 C72 12 67 19 60 19 C54 19 52 25 55 29" />
        <path d="M55 29 L12 61 Q8 65 15 66 L105 66 Q112 65 108 61 L65 29" />
        <path d="M55 29 Q60 25 65 29" />
      </g>
    </svg>
  );
}

export default function Fio({ products }: FioProps) {
  const addProduct = useCartStore((state) => state.addProduct);
  const araraRef = useRef<HTMLDivElement>(null);

  const [produtoAberto, setProdutoAberto] =
    useState<ProductType | null>(null);

  const [indice, setIndice] = useState(0);

  const produtosValidos = products.filter((produto) =>
    Boolean(produto.image)
  );

  if (produtosValidos.length === 0) return null;

  const total = produtosValidos.length;
  const produtoCentral = produtosValidos[indice] ?? produtosValidos[0];

  function navegar(direcao: number) {
    const novoIndice = (indice + direcao + total) % total;
    setIndice(novoIndice);

    const item = araraRef.current?.querySelector(
      `[data-produto-index="${novoIndice}"]`
    );

    item?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-[#f7f5f1] text-[#242321]"
      aria-label="Coleção de roupas"
    >
      <style jsx>{`
        .fio-fundo {
          background:
            radial-gradient(
              ellipse at 50% 34%,
              rgba(255, 255, 255, 0.98) 0%,
              rgba(255, 255, 255, 0.56) 37%,
              transparent 73%
            ),
            linear-gradient(180deg, #f9f8f5 0%, #f1eee8 100%);
        }

        .arara-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: smooth;
        }

        .arara-scroll::-webkit-scrollbar {
          display: none;
        }

        .arara-item {
          flex: 0 0 190px;
          transition:
            flex-basis 650ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 450ms ease;
          transform-origin: center top;
        }

        .arara-item:hover,
        .arara-item:focus-within {
          flex-basis: 310px;
        }

        .arara-roupa {
          height: 290px;
          transform: rotateY(65deg) scale(0.82);
          transform-style: preserve-3d;
          transform-origin: center center;
          backface-visibility: hidden;
          transition:
            height 650ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 500ms ease;
          filter: drop-shadow(0 13px 12px rgba(35, 30, 25, 0.10));
        }

        .arara-item:hover .arara-roupa,
        .arara-item:focus-within .arara-roupa {
          height: 390px;
          transform: rotateY(0deg) scale(1.02);
          filter: drop-shadow(0 22px 18px rgba(35, 30, 25, 0.17));
        }

        .arara-item {
        flex: 0 0 190px;
        perspective: 1000px;
        transform-style: preserve-3d;
        transition:
          flex-basis 650ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 450ms ease;
      }

        .arara-nome {
          transition:
            opacity 350ms ease,
            transform 350ms ease;
        }

        .fio-botao {
          transition:
            transform 220ms ease,
            background 220ms ease,
            border-color 220ms ease;
        }

        .fio-botao:hover {
          transform: translateY(-2px);
        }

        .fio-detalhes {
          animation: detalhes-entrada 420ms ease both;
        }

        @keyframes detalhes-entrada {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1023px) {
          .arara-item {
            flex-basis: 160px;
          }

          .arara-item:hover,
          .arara-item:focus-within {
            flex-basis: 190px;
          }

          .arara-roupa {
            height: 270px;
          }

          .arara-item:hover .arara-roupa,
          .arara-item:focus-within .arara-roupa {
            height: 300px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .arara-item,
          .arara-roupa,
          .arara-nome,
          .fio-botao {
            transition: none;
          }

          .fio-detalhes {
            animation: none;
          }
        }
      `}</style>

      <div className="fio-fundo absolute inset-0 -z-10" />

      {produtoAberto ? (
        <div className="fio-detalhes mx-auto grid min-h-[650px] max-w-7xl grid-cols-1 items-center gap-8 px-5 py-12 sm:px-8 md:grid-cols-2 md:gap-14 md:px-12 lg:gap-20">
          <div className="relative flex min-h-[320px] items-center justify-center rounded-3xl bg-white/55 p-5 sm:min-h-[480px] sm:p-10">
            <div className="absolute inset-x-10 bottom-8 h-12 rounded-[50%] bg-black/[0.07] blur-2xl" />
            <img
              src={produtoAberto.image}
              alt={produtoAberto.name}
              className="relative z-10 max-h-[480px] w-full object-contain drop-shadow-[0_22px_24px_rgba(0,0,0,0.13)]"
            />
          </div>

          <div className="mx-auto w-full max-w-lg py-4">
            <button
              type="button"
              onClick={() => setProdutoAberto(null)}
              className="fio-botao mb-10 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-[#45423d] hover:border-black/25"
            >
              <span aria-hidden="true">←</span>
              Voltar à coleção
            </button>

            <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#827b70]">
              Agape Streetwear
            </p>

            <h2 className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {produtoAberto.name}
            </h2>

            <p className="mt-5 text-2xl font-medium tracking-tight text-[#38352f]">
              {formatarPreco(
                produtoAberto.price,
                produtoAberto.currency || "brl"
              )}
            </p>

            {produtoAberto.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#716b62] sm:text-base">
                {produtoAberto.description}
              </p>
            )}

            <button
              type="button"
              onClick={() => addProduct(produtoAberto)}
              className="fio-botao mt-9 flex min-h-14 w-full items-center justify-center rounded-full bg-[#22211f] px-7 py-4 text-sm font-medium tracking-wide text-white hover:bg-[#44413c]"
            >
              Adicionar à sacola
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-[#898278]">
              Descubra todos os detalhes desta peça.
            </p>
          </div>
        </div>
      ) : (
        <>
          <header className="relative z-10 px-5 pb-1 pt-12 text-center sm:pt-16">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.38em] text-[#8b8174] sm:text-xs">
              AGAPE STREETWEAR
            </p>

            <h2 className="text-3xl font-medium tracking-[-0.045em] text-[#25231f] sm:text-5xl lg:text-6xl">
              Escolha sua próxima peça
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#827b72] sm:text-base">
              Explore a coleção e selecione a peça que combina com você.
            </p>
          </header>

          {/* Arara horizontal */}
          <div className="relative mx-auto mt-8 w-full max-w-[1600px] pb-8 pt-5 sm:mt-12">
            {/* Barra metálica */}
            <div className="pointer-events-none absolute left-[4%] right-[4%] top-[45px] z-10 h-[5px] rounded-full bg-gradient-to-b from-white via-[#89857e] to-[#d5d1ca] shadow-sm" />

            {/* Suportes da arara */}
            <div className="pointer-events-none absolute left-[4%] top-[35px] z-0 h-5 w-[5px] rounded-full bg-[#aaa69e]" />
            <div className="pointer-events-none absolute right-[4%] top-[35px] z-0 h-5 w-[5px] rounded-full bg-[#aaa69e]" />

            <div
              ref={araraRef}
              className="arara-scroll relative z-20 flex min-h-[510px] items-start overflow-x-auto overflow-y-hidden px-[8%] pb-5 pt-0"
            >
              {produtosValidos.map((produto, posicao) => (
                <button
                  key={produto.id}
                  type="button"
                  data-produto-index={posicao}
                  aria-label={`Ver ${produto.name}`}
                  onMouseEnter={() => setIndice(posicao)}
                  onFocus={() => setIndice(posicao)}
                  onClick={() => setProdutoAberto(produto)}
                  className="arara-item group relative flex shrink-0 flex-col items-center border-0 bg-transparent px-2 pt-0 outline-none focus-visible:ring-2 focus-visible:ring-[#8b8174]"
                >
                  {/* Cabide preso à barra */}
                  <div className="relative z-20 w-[78px]">
                    <Cabide id={`arara-${produto.id}`} />
                  </div>

                  {/* Produto */}
                  <div className="relative z-10 -mt-[17px] flex w-full items-start justify-center">
                    <img
                      src={produto.image}
                      alt={produto.name}
                      draggable={false}
                      loading={posicao < 5 ? "eager" : "lazy"}
                      className="arara-roupa w-full select-none object-contain"
                    />
                  </div>

                  <span className="arara-nome mt-2 max-w-full truncate px-2 text-center text-xs font-medium tracking-wide text-[#514c44]">
                    {produto.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Setas de navegação */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navegar(-1)}
                  aria-label="Peça anterior"
                  className="fio-botao absolute left-3 top-[48%] z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl text-[#38352f] shadow-md backdrop-blur-md hover:bg-white sm:left-6 sm:h-12 sm:w-12"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => navegar(1)}
                  aria-label="Próxima peça"
                  className="fio-botao absolute right-3 top-[48%] z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl text-[#38352f] shadow-md backdrop-blur-md hover:bg-white sm:right-6 sm:h-12 sm:w-12"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <div className="relative z-30 flex flex-col items-center gap-5 pb-12">
            <p className="text-xs tracking-wide text-[#827b72]">
              {indice + 1} de {total} peças
            </p>

            <button
              type="button"
              onClick={() => setProdutoAberto(produtoCentral)}
              className="fio-botao inline-flex min-h-12 items-center justify-center rounded-full border border-[#292722] bg-[#292722] px-8 py-3 text-sm font-medium text-white hover:border-[#48453e] hover:bg-[#48453e]"
            >
              Ver detalhes da peça
              <span className="ml-3" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
