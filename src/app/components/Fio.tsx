
"use client";

import { useState } from "react";
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

function Cabide({
  id,
  destaque,
}: {
  id: string;
  destaque: boolean;
}) {
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
        strokeWidth={destaque ? 2.7 : 2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Gancho que envolve visualmente o fio */}
        <path d="M60 5 C60 0 67 0 69 5 C72 12 67 19 60 19 C54 19 52 25 55 29" />

        {/* Corpo do cabide */}
        <path d="M55 29 L12 61 Q8 65 15 66 L105 66 Q112 65 108 61 L65 29" />

        {/* Pequeno reforço central */}
        <path d="M55 29 Q60 25 65 29" />
      </g>
    </svg>
  );
}

export default function Fio({ products }: FioProps) {
  const addProduct = useCartStore((state) => state.addProduct);
  const [indice, setIndice] = useState(0);
  const [produtoAberto, setProdutoAberto] =
    useState<ProductType | null>(null);

  const produtosValidos = products.filter(
    (produto) => Boolean(produto.image)
  );

  if (produtosValidos.length === 0) {
    return null;
  }

  const total = produtosValidos.length;

  function navegar(direcao: number) {
    setIndice((atual) => (atual + direcao + total) % total);
  }

  function distanciaCircular(posicao: number) {
    let distancia = posicao - indice;

    if (distancia > total / 2) distancia -= total;
    if (distancia < -total / 2) distancia += total;

    return distancia;
  }

  const produtoCentral = produtosValidos[indice];

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

        .fio-palco {
          perspective: 1200px;
          perspective-origin: 50% 36%;
          transform-style: preserve-3d;
        }

        .fio-item {
          transform-style: preserve-3d;
          transform-origin: 50% 12%;
          transition:
            left 700ms cubic-bezier(0.22, 1, 0.36, 1),
            top 700ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 500ms ease,
            filter 500ms ease;
          will-change: transform, left, top;
          -webkit-tap-highlight-color: transparent;
        }

        .fio-imagem {
          transform-style: preserve-3d;
          transform-origin: 50% 12%;
          transition:
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 500ms ease;
          filter: drop-shadow(0 16px 14px rgba(35, 30, 25, 0.11));
        }

        .fio-item:hover .fio-imagem {
          filter: drop-shadow(0 23px 20px rgba(35, 30, 25, 0.16));
        }

        .fio-fio {
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.13));
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

        @media (prefers-reduced-motion: reduce) {
          .fio-item,
          .fio-imagem,
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
                onClick={() => {
                    addProduct(produtoAberto);
                }}
                className="fio-botao mt-9 flex min-h-14 w-full items-center justify-center rounded-full bg-[#22211f] px-7 py-4 text-sm font-medium tracking-wide text-white hover:bg-[#44413c]"
                >
                Adicionar à sacola
                <span className="ml-3" aria-hidden="true">
                </span>
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

          {/* Palco 3D para telas maiores */}
          <div className="fio-palco relative mx-auto hidden h-[590px] w-full max-w-[1500px] overflow-hidden lg:block lg:h-[680px]">
            {/* Sombra suave no chão */}
            <div className="pointer-events-none absolute inset-x-[18%] bottom-[35px] h-12 rounded-[50%] bg-[#777064]/10 blur-3xl" />

            {/* Fio curvo: os produtos são posicionados seguindo esta curva */}
            <svg
              className="fio-fio pointer-events-none absolute left-0 top-0 z-10 h-[145px] w-full overflow-visible"
              viewBox="0 0 1400 180"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="fio-metal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d9d6d0" />
                  <stop offset="45%" stopColor="#77736d" />
                  <stop offset="70%" stopColor="#f5f3ee" />
                  <stop offset="100%" stopColor="#aaa59d" />
                </linearGradient>
              </defs>

              <path
                d="M 8 5 Q 700 250 1392 5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="5"
                opacity="0.7"
              />
              <path
                d="M 8 5 Q 700 250 1392 5"
                fill="none"
                stroke="url(#fio-metal)"
                strokeWidth="2.2"
              />
            </svg>

            {produtosValidos.map((produto, posicao) => {
              const distancia = distanciaCircular(posicao);
              const distanciaAbs = Math.abs(distancia);
              const visivel = distanciaAbs <= 2.5;

              if (!visivel) return null;

              /*
               * A coordenada vertical usa a mesma curva do SVG.
               * Assim, o topo do gancho acompanha a posição do fio.
               */
              const curva = Math.max(
                0,
                1 - Math.pow(distancia / 2.5, 2)
              );
              const wireY = (5 + 122.5 * curva) * (145 / 180);

              const xPct = 50 + distancia * 19;
              const rotacaoY = distancia * -31;
              const rotacaoZ = distancia * -3.5;
              const escala = Math.max(0.61, 1 - distanciaAbs * 0.14);
              const opacidade = Math.max(0.46, 1 - distanciaAbs * 0.18);
              const largura = distanciaAbs < 0.1 ? 270 : 250;

              return (
                <button
                  key={produto.id}
                  type="button"
                  aria-label={`Ver ${produto.name}`}
                  onMouseEnter={() => setIndice(posicao)}
                  onFocus={() => setIndice(posicao)}
                  onClick={() => {
                    if (distancia === 0) {
                      setProdutoAberto(produto);
                    } else {
                      setIndice(posicao);
                    }
                  }}
                  className="fio-item absolute z-20 flex flex-col items-center border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#8b8174] focus-visible:ring-offset-4"
                  style={{
                    left: `${xPct}%`,
                    top: `${wireY - 2}px`,
                    width: `${largura}px`,
                    opacity: opacidade,
                    filter: `blur(${Math.max(0, distanciaAbs - 1.5) * 0.35}px)`,
                    transform: `translateX(-50%) rotateY(${rotacaoY}deg) rotateZ(${rotacaoZ}deg) scale(${escala})`,
                    zIndex: 30 - Math.round(distanciaAbs * 5),
                  }}
                >
                  {/* O cabide cruza o fio para parecer realmente suspenso */}
                  <div className="relative z-20 w-[86px] shrink-0">
                    <Cabide
                      id={`desktop-${produto.id}`}
                      destaque={distancia === 0}
                    />
                  </div>

                  {/* A peça fica alinhada abaixo dos ombros do cabide */}
                  <div
                    className="fio-imagem relative z-10 -mt-[19px] flex h-[355px] w-full items-start justify-center"
                    style={{
                      transform: `rotateY(${distancia * 7}deg)`,
                    }}
                  >
                    <img
                      src={produto.image}
                      alt={produto.name}
                      draggable={false}
                      className="h-full w-full select-none object-contain"
                      loading={distanciaAbs <= 1 ? "eager" : "lazy"}
                    />
                  </div>

                  <span
                    className={`mt-1 max-w-[240px] truncate text-center text-xs tracking-wide transition-opacity ${
                      distancia === 0
                        ? "font-medium text-[#39352f] opacity-100"
                        : "text-[#777168] opacity-80"
                    }`}
                  >
                    {produto.name}
                  </span>
                </button>
              );
            })}

            {/* Controles */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navegar(-1)}
                  aria-label="Peça anterior"
                  className="fio-botao absolute left-5 top-[48%] z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/80 text-2xl text-[#38352f] shadow-sm backdrop-blur-md hover:bg-white lg:left-10"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => navegar(1)}
                  aria-label="Próxima peça"
                  className="fio-botao absolute right-5 top-[48%] z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/80 text-2xl text-[#38352f] shadow-sm backdrop-blur-md hover:bg-white lg:right-10"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Versão para celular */}
          <div className="relative px-4 pb-10 pt-5 lg:hidden">
            <div className="relative mx-auto flex min-h-[420px] max-w-[410px] flex-col items-center justify-center">
              <svg
                className="pointer-events-none absolute left-0 top-0 z-10 h-[90px] w-full"
                viewBox="0 0 400 110"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="fio-mobile-metal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d9d6d0" />
                    <stop offset="50%" stopColor="#77736d" />
                    <stop offset="100%" stopColor="#c9c4bb" />
                  </linearGradient>
                </defs>
                <path
                  d="M 2 3 Q 200 150 398 3"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="4"
                  opacity="0.8"
                />
                <path
                  d="M 2 3 Q 200 150 398 3"
                  fill="none"
                  stroke="url(#fio-mobile-metal)"
                  strokeWidth="2"
                />
              </svg>

              <div className="relative z-20 mt-5 w-[76px]">
                <Cabide id="mobile" destaque />
              </div>

              <div className="relative z-10 -mt-[17px] flex h-[310px] w-full items-center justify-center">
                <img
                  key={produtoCentral.id}
                  src={produtoCentral.image}
                  alt={produtoCentral.name}
                  className="h-full w-full animate-[fio-aparecer_450ms_ease] object-contain drop-shadow-[0_18px_15px_rgba(0,0,0,0.12)]"
                />
              </div>

              <p className="mt-1 max-w-full truncate px-4 text-center text-sm font-medium text-[#39352f]">
                {produtoCentral.name}
              </p>
              <p className="mt-2 text-sm text-[#827b72]">
                {formatarPreco(
                  produtoCentral.price,
                  produtoCentral.currency || "brl"
                )}
              </p>
            </div>

            {total > 1 && (
              <div className="mt-4 flex items-center justify-center gap-8">
                <button
                  type="button"
                  onClick={() => navegar(-1)}
                  aria-label="Peça anterior"
                  className="fio-botao flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-2xl"
                >
                  ‹
                </button>

                <span className="min-w-[64px] text-center text-xs tabular-nums text-[#827b72]">
                  {indice + 1} / {total}
                </span>

                <button
                  type="button"
                  onClick={() => navegar(1)}
                  aria-label="Próxima peça"
                  className="fio-botao flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-2xl"
                >
                  ›
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setProdutoAberto(produtoCentral)}
              className="fio-botao mx-auto mt-6 flex min-h-12 w-full max-w-[320px] items-center justify-center rounded-full bg-[#22211f] px-6 py-3 text-sm font-medium text-white hover:bg-[#44413c]"
            >
              Ver detalhes da peça
              <span className="ml-3" aria-hidden="true">
                →
              </span>
            </button>
          </div>

          {/* Ação para a peça central no desktop */}
          <div className="relative z-40 hidden justify-center pb-12 lg:flex">
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
