"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as TeclaReact,
  type PointerEvent as PonteiroReact,
} from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { ProductType } from "@/src/types/ProductType";
import { useCartStore } from "@/src/store";

/* ------------------------------------------------------------------ */
/* Ajustes rápidos                                                     */
/* ------------------------------------------------------------------ */

// Cor de destaque (preços, indicador, faixa).
const COR_DESTAQUE = "#E01E2B";

// true  = a foto da Stripe JÁ tem o cabide (recorte começa no gancho).
// false = o código desenha um cabide em cima da foto.
const CABIDE_NA_FOTO = true;

// Altura da foto no mundo 3D e altura da barra.
const ALTURA_FOTO = 1.85;
const Y_BARRA = 1.55;

// Balanço bem leve (radianos). Coloque 0 para as peças ficarem paradas.
const BALANCO = 0.008;

// Textos da faixa vermelha no rodapé.
const FAIXA = ["Agape Streetwear", "Nova coleção", "Feito pra rua"];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

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

// Distância circular com sinal: o caminho mais curto até a peça ativa.
// Assim, ao passar da última para a primeira, as peças deslizam 1 posição
// em vez de atravessar a tela inteira.
function distanciaCircular(indice: number, ativo: number, total: number) {
  let d = (((indice - ativo) % total) + total) % total;
  if (d > total / 2) d -= total;
  return d;
}

/* ------------------------------------------------------------------ */
/* Peça 3D                                                             */
/* ------------------------------------------------------------------ */

function Roupa3D({
  produto,
  indice,
  indiceAtivo,
  total,
  espaco,
  aoSelecionar,
  aoAbrir,
}: {
  produto: ProductType;
  indice: number;
  indiceAtivo: number;
  total: number;
  espaco: number;
  aoSelecionar: () => void;
  aoAbrir: () => void;
}) {
  const grupo = useRef<THREE.Group>(null);
  const materialFoto = useRef<THREE.MeshBasicMaterial>(null);
  const materialSombra = useRef<THREE.MeshBasicMaterial>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Uma única textura, usada na foto e na sombra (sem baixar duas vezes).
  const textura = useTexture(produto.image);

  useEffect(() => {
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 8;
    textura.needsUpdate = true;
  }, [textura]);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      document.body.style.cursor = "auto";
    };
  }, []);

  // Largura segue a proporção real da foto.
  const largura = useMemo(() => {
    const imagem = textura.image as { width?: number; height?: number } | undefined;
    const proporcao =
      imagem?.width && imagem?.height ? imagem.width / imagem.height : 0.8;
    return ALTURA_FOTO * Math.min(1.35, Math.max(0.5, proporcao));
  }, [textura]);

  const deslocamentoFoto = CABIDE_NA_FOTO ? 0.04 : 0.34;

  useFrame((estado, delta) => {
    const g = grupo.current;
    if (!g) return;

    const d = distanciaCircular(indice, indiceAtivo, total);
    const ativo = d === 0;
    const distancia = Math.abs(d);
    const suavizar = 1 - Math.exp(-5.5 * delta);

    const alvoX = d * espaco;
    const alvoZ = ativo ? 0.9 : -distancia * 0.14;
    const alvoRotacao = ativo ? 0 : Math.sign(d) * 1.0;
    const alvoEscala = ativo ? 1.18 : 0.86;
    const alvoOpacidade = distancia <= 2 ? 1 : distancia === 3 ? 0.35 : 0;

    // Peças escondidas "teletransportam" para o lugar certo sem aparecer.
    if (distancia > 3) {
      g.position.x = alvoX;
    } else {
      g.position.x = THREE.MathUtils.lerp(g.position.x, alvoX, suavizar);
    }
    g.position.z = THREE.MathUtils.lerp(g.position.z, alvoZ, suavizar);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, alvoRotacao, suavizar);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, alvoEscala, suavizar));

    // Balanço leve, a partir do gancho (o pivô do grupo é a barra).
    g.rotation.z =
      Math.sin(estado.clock.elapsedTime * 0.9 + indice * 1.3) *
      BALANCO *
      (ativo ? 0.5 : 1);

    if (materialFoto.current) {
      materialFoto.current.opacity = THREE.MathUtils.lerp(
        materialFoto.current.opacity,
        alvoOpacidade,
        suavizar
      );
      if (materialSombra.current) {
        materialSombra.current.opacity = materialFoto.current.opacity * 0.16;
      }
      g.visible = materialFoto.current.opacity > 0.01;
    }
  });

  function aoPassarMouse(evento: ThreeEvent<PointerEvent>) {
    // Só o mouse seleciona ao passar; no toque, vale o clique.
    if (evento.pointerType !== "mouse") return;
    evento.stopPropagation();
    document.body.style.cursor = "pointer";
    if (temporizador.current) clearTimeout(temporizador.current);
    // Pequena espera evita "tremer" quando o mouse cruza várias peças.
    temporizador.current = setTimeout(aoSelecionar, 90);
  }

  function aoSairMouse() {
    document.body.style.cursor = "auto";
    if (temporizador.current) clearTimeout(temporizador.current);
  }

  function aoClicar(evento: ThreeEvent<MouseEvent>) {
    evento.stopPropagation();
    const ativo = distanciaCircular(indice, indiceAtivo, total) === 0;
    if (ativo) aoAbrir();
    else aoSelecionar();
  }

  return (
    <group
      ref={grupo}
      position={[0, Y_BARRA, 0]}
      visible={false}
      onPointerOver={aoPassarMouse}
      onPointerOut={aoSairMouse}
      onClick={aoClicar}
    >
      {/* Cabide desenhado (só quando a foto não tem cabide) */}
      {!CABIDE_NA_FOTO && (
        <group>
          <mesh position={[0, -0.06, 0]}>
            <torusGeometry args={[0.05, 0.012, 8, 24, Math.PI * 1.6]} />
            <meshBasicMaterial color="#2b2926" />
          </mesh>
          <Line
            points={[
              [0, -0.11, 0],
              [0, -0.2, 0],
            ]}
            color="#2b2926"
            lineWidth={1.6}
          />
          <Line
            points={[
              [-0.5, -0.33, 0],
              [0, -0.2, 0],
              [0.5, -0.33, 0],
              [-0.5, -0.33, 0],
            ]}
            color="#2b2926"
            lineWidth={1.6}
          />
        </group>
      )}

      {/* Sombra falsa, atrás da peça (reaproveita a mesma textura) */}
      <mesh
        position={[0.05, -ALTURA_FOTO / 2 - deslocamentoFoto - 0.04, -0.03]}
      >
        <planeGeometry args={[largura * 1.02, ALTURA_FOTO * 1.02]} />
        <meshBasicMaterial
          ref={materialSombra}
          map={textura}
          color="#000000"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Foto da peça, presa ao topo */}
      <mesh position={[0, -ALTURA_FOTO / 2 - deslocamentoFoto, 0]}>
        <planeGeometry args={[largura, ALTURA_FOTO]} />
        <meshBasicMaterial
          ref={materialFoto}
          map={textura}
          transparent
          opacity={0}
          alphaTest={0.02}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Área de clique, um pouco maior que a peça */}
      <mesh position={[0, -ALTURA_FOTO / 2 - deslocamentoFoto, -0.05]}>
        <planeGeometry args={[largura + 0.2, ALTURA_FOTO + 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cena                                                                */
/* ------------------------------------------------------------------ */

function CenaCloset({
  produtos,
  indiceAtivo,
  selecionar,
  abrir,
}: {
  produtos: ProductType[];
  indiceAtivo: number;
  selecionar: (indice: number) => void;
  abrir: () => void;
}) {
  const { size, camera } = useThree();
  const estreito = size.width < 640;

  // Em telas estreitas a câmera recua para a peça central caber com folga.
  useEffect(() => {
    camera.position.z = estreito ? 11 : 8;
    camera.updateProjectionMatrix();
  }, [estreito, camera]);

  const espaco = estreito ? 1.3 : 1.6;

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[0, 5, 5]} intensity={1.6} />

      {/* Barra da arara: o cilindro nasce em pé, por isso o giro de 90 graus */}
      <mesh position={[0, Y_BARRA, -0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 40, 24]} />
        <meshStandardMaterial color="#b9b5ad" metalness={0.45} roughness={0.35} />
      </mesh>

      {produtos.map((produto, indice) => (
        <Suspense key={produto.id} fallback={null}>
          <Roupa3D
            produto={produto}
            indice={indice}
            indiceAtivo={indiceAtivo}
            total={produtos.length}
            espaco={espaco}
            aoSelecionar={() => selecionar(indice)}
            aoAbrir={abrir}
          />
        </Suspense>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Componente da página                                                */
/* ------------------------------------------------------------------ */

export default function Fio({ products }: FioProps) {
  const addProduct = useCartStore((state) => state.addProduct);

  const [indice, setIndice] = useState(0);
  const [produtoAberto, setProdutoAberto] = useState<ProductType | null>(null);
  const [adicionado, setAdicionado] = useState(false);
  const [naTela, setNaTela] = useState(true);

  const secao = useRef<HTMLElement>(null);
  const toqueInicial = useRef<number | null>(null);

  const produtosValidos = useMemo(
    () => products.filter((produto) => Boolean(produto.image)),
    [products]
  );
  const total = produtosValidos.length;
  const indiceSeguro = total > 0 ? Math.min(indice, total - 1) : 0;
  const produtoCentral = produtosValidos[indiceSeguro];

  // Pausa a cena 3D quando a seção sai da tela (economiza bateria).
  useEffect(() => {
    const elemento = secao.current;
    if (!elemento || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      ([entrada]) => setNaTela(entrada.isIntersecting),
      { threshold: 0.05 }
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const navegar = useCallback(
    (direcao: number) => {
      if (total === 0) return;
      setIndice((atual) => (atual + direcao + total) % total);
    },
    [total]
  );

  const abrir = useCallback(() => {
    if (produtoCentral) setProdutoAberto(produtoCentral);
  }, [produtoCentral]);

  const fechar = useCallback(() => {
    setProdutoAberto(null);
    setAdicionado(false);
  }, []);

  // Mensagem "Adicionado" some sozinha.
  useEffect(() => {
    if (!adicionado) return;
    const t = setTimeout(() => setAdicionado(false), 1800);
    return () => clearTimeout(t);
  }, [adicionado]);

  if (total === 0) return null;

  function aoTeclar(evento: TeclaReact) {
    if (produtoAberto) {
      if (evento.key === "Escape") fechar();
      return;
    }
    if (evento.key === "ArrowLeft") navegar(-1);
    if (evento.key === "ArrowRight") navegar(1);
    if (evento.key === "Enter" && evento.target === evento.currentTarget) abrir();
  }

  // Swipe no celular: arrastar para o lado troca de peça.
  function aoTocarInicio(evento: PonteiroReact) {
    if (evento.pointerType === "mouse") return;
    toqueInicial.current = evento.clientX;
  }

  function aoTocarFim(evento: PonteiroReact) {
    if (toqueInicial.current === null) return;
    const diferenca = evento.clientX - toqueInicial.current;
    toqueInicial.current = null;
    if (Math.abs(diferenca) > 50) navegar(diferenca < 0 ? 1 : -1);
  }

  return (
    <section
      ref={secao}
      tabIndex={0}
      onKeyDown={aoTeclar}
      aria-label="Coleção Agape Streetwear"
      className="relative isolate w-full overflow-hidden bg-[#f7f5f1] text-[#242321] outline-none focus-visible:ring-2 focus-visible:ring-black/40"
    >
      <style>{`
        @keyframes agape-entrar { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes agape-rolar { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .agape-entrar { animation: agape-entrar .45s ease-out both; }
        .agape-faixa { display: inline-block; white-space: nowrap; animation: agape-rolar 40s linear infinite; }
        .agape-canvas canvas { touch-action: pan-y !important; }
        @media (prefers-reduced-motion: reduce) { .agape-entrar, .agape-faixa { animation: none; } }
      `}</style>

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,white_0%,#f7f5f1_65%,#eeeae3_100%)]" />

      {/* Anuncia a peça central para leitores de tela */}
      <p className="sr-only" aria-live="polite">
        {produtoCentral.name}, peça {indiceSeguro + 1} de {total}
      </p>

      {produtoAberto ? (
        /* ----------------------- Detalhe da peça ----------------------- */
        <div className="agape-entrar mx-auto grid min-h-[650px] max-w-7xl grid-cols-1 items-center gap-8 px-5 py-12 sm:px-8 md:grid-cols-2 md:gap-14 md:px-12">
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl bg-white/70 p-5 sm:min-h-[480px] sm:p-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={produtoAberto.image}
              alt={produtoAberto.name}
              className="max-h-[480px] w-full object-contain drop-shadow-xl"
            />
          </div>

          <div className="mx-auto w-full max-w-lg">
            <button
              type="button"
              onClick={fechar}
              className="mb-10 min-h-11 rounded-full border border-black/10 bg-white/70 px-5 py-2 text-sm hover:bg-white"
            >
              ← Voltar à coleção
            </button>

            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[#827b70]">
              Agape Streetwear
            </p>

            <h2 className="text-3xl font-medium sm:text-5xl">
              {produtoAberto.name}
            </h2>

            <p className="mt-5 text-2xl font-medium">
              {formatarPreco(produtoAberto.price, produtoAberto.currency || "brl")}
            </p>

            {produtoAberto.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#716b62]">
                {produtoAberto.description}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                addProduct(produtoAberto);
                setAdicionado(true);
              }}
              className="mt-9 min-h-14 w-full rounded-full px-7 py-4 text-sm font-medium text-white transition-colors"
              style={{ background: adicionado ? COR_DESTAQUE : "#22211f" }}
            >
              {adicionado ? "Adicionado à sacola ✓" : "Adicionar à sacola"}
            </button>
          </div>
        </div>
      ) : (
        /* --------------------------- Closet 3D --------------------------- */
        <>
          <header className="relative z-10 px-5 pb-1 pt-12 text-center sm:pt-16">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.38em] text-[#8b8174] sm:text-xs">
              AGAPE STREETWEAR
            </p>

            <h2 className="text-3xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
              Escolha sua próxima peça
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#827b72] sm:text-base">
              Passe o mouse ou arraste para o lado. Clique na peça para ver os detalhes.
            </p>
          </header>

          <div
            className="agape-canvas relative mx-auto h-[460px] w-full max-w-[1500px] sm:h-[600px]"
            onPointerDown={aoTocarInicio}
            onPointerUp={aoTocarFim}
            onPointerCancel={() => (toqueInicial.current = null)}
          >
            <Canvas
              camera={{ position: [0, 0.4, 8], fov: 38 }}
              dpr={[1, 1.75]}
              gl={{ antialias: true, alpha: true }}
              frameloop={naTela ? "always" : "never"}
            >
              <CenaCloset
                produtos={produtosValidos}
                indiceAtivo={indiceSeguro}
                selecionar={setIndice}
                abrir={abrir}
              />
            </Canvas>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navegar(-1)}
                  aria-label="Peça anterior"
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl shadow-md transition-colors hover:bg-white sm:left-6 sm:h-12 sm:w-12"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => navegar(1)}
                  aria-label="Próxima peça"
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl shadow-md transition-colors hover:bg-white sm:right-6 sm:h-12 sm:w-12"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Nome, preço e botão da peça central */}
          <div
            key={produtoCentral.id}
            className="agape-entrar relative z-10 flex flex-col items-center gap-3 px-5 pb-12 text-center"
          >
            <h3 className="text-2xl font-medium sm:text-3xl">
              {produtoCentral.name}
            </h3>
            <p className="text-lg font-medium" style={{ color: COR_DESTAQUE }}>
              {formatarPreco(produtoCentral.price, produtoCentral.currency || "brl")}
            </p>

            <button
              type="button"
              onClick={abrir}
              className="mt-1 min-h-12 rounded-full bg-[#292722] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#48453e]"
            >
              Ver detalhes da peça →
            </button>

            {/* Indicador de posição */}
            {total > 1 && (
              <div className="mt-2 flex items-center gap-1" role="group" aria-label="Escolher peça">
                {produtosValidos.map((produto, i) => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => setIndice(i)}
                    aria-label={`Ir para ${produto.name}`}
                    aria-current={i === indiceSeguro}
                    className="flex h-6 items-center px-1"
                  >
                    <span
                      className="block h-1.5 rounded-full transition-all"
                      style={{
                        width: i === indiceSeguro ? 28 : 8,
                        background: i === indiceSeguro ? COR_DESTAQUE : "#c9c4ba",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Faixa de texto */}
          <div
            aria-hidden="true"
            className="overflow-hidden text-white"
            style={{ background: COR_DESTAQUE }}
          >
            <div className="agape-faixa py-3.5 text-[13px] font-semibold tracking-wide">
              {[0, 1].map((copia) => (
                <span key={copia}>
                  {[...FAIXA, ...FAIXA, ...FAIXA].map((texto, i) => (
                    <span key={i}>
                      {texto}
                      <span className="mx-6 opacity-70">+</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}