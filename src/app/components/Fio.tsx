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

// Cor de destaque (faixa do rodapé e "Adicionado").
const COR_DESTAQUE = "#E01E2B";

// Fundo da seção (off-white liso, como na referência).
const COR_FUNDO = "#F5F3EE";

// true  = a foto da Stripe JÁ tem o cabide (o recorte começa no gancho).
// false = o código desenha um cabide em cima da foto.
const CABIDE_NA_FOTO = true;

// Tamanho da foto e altura da barra no mundo 3D.
const ALTURA_FOTO = 1.6;
const Y_BARRA = 1.5;

// Balanço bem leve (radianos). Coloque 0 para as peças ficarem paradas.
const BALANCO = 0.006;

// Textos do selo e da faixa vermelha do rodapé.
const SELO_ESQUERDA = "Na arara";
const SELO_DIREITA = "Agape · [CIDADE]";
const FAIXA = ["Streetwear feito pra rua", "[SUA FRASE]", "Agape Streetwear"];

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
function distanciaCircular(indice: number, ativo: number, total: number) {
  let d = (((indice - ativo) % total) + total) % total;
  if (d > total / 2) d -= total;
  return d;
}

// Posição horizontal de cada peça: a central tem um respiro maior em volta,
// e as outras ficam próximas umas das outras, como na referência.
function posicaoX(d: number, estreito: boolean) {
  if (d === 0) return 0;
  const primeiro = estreito ? 0.95 : 1.05;
  const passo = estreito ? 0.45 : 0.5;
  return Math.sign(d) * (primeiro + (Math.abs(d) - 1) * passo);
}

/* ------------------------------------------------------------------ */
/* Peça 3D                                                             */
/* ------------------------------------------------------------------ */

function Roupa3D({
  produto,
  indice,
  indiceAtivo,
  total,
  estreito,
  aoSelecionar,
  aoAbrir,
}: {
  produto: ProductType;
  indice: number;
  indiceAtivo: number;
  total: number;
  estreito: boolean;
  aoSelecionar: () => void;
  aoAbrir: () => void;
}) {
  const grupo = useRef<THREE.Group>(null);
  const materialFoto = useRef<THREE.MeshBasicMaterial>(null);
  const materialSombra = useRef<THREE.MeshBasicMaterial>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Uma única textura, usada na foto e na sombra.
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

  const largura = useMemo(() => {
    const imagem = textura.image as { width?: number; height?: number } | undefined;
    const proporcao =
      imagem?.width && imagem?.height ? imagem.width / imagem.height : 0.8;
    return ALTURA_FOTO * Math.min(1.35, Math.max(0.5, proporcao));
  }, [textura]);

  const deslocamentoFoto = CABIDE_NA_FOTO ? 0.02 : 0.3;
  const maxVisivel = estreito ? 2 : 4;

  useFrame((estado, delta) => {
    const g = grupo.current;
    if (!g) return;

    const d = distanciaCircular(indice, indiceAtivo, total);
    const ativo = d === 0;
    const distancia = Math.abs(d);
    const suavizar = 1 - Math.exp(-5.5 * delta);

    const alvoX = posicaoX(d, estreito);
    const alvoZ = ativo ? 0.7 : 0;
    const alvoRotacao = ativo ? 0 : Math.sign(d) * 1.05;
    const alvoEscala = ativo ? 1.12 : 0.82;
    const alvoOpacidade = distancia <= maxVisivel ? 1 : 0;

    // Peças escondidas "teletransportam" para o lugar certo sem aparecer.
    if (distancia > maxVisivel + 1) {
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
        materialSombra.current.opacity = materialFoto.current.opacity * 0.14;
      }
      g.visible = materialFoto.current.opacity > 0.01;
    }
  });

  function aoPassarMouse(evento: ThreeEvent<PointerEvent>) {
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
          <mesh position={[0, -0.05, 0]}>
            <torusGeometry args={[0.045, 0.01, 8, 24, Math.PI * 1.6]} />
            <meshBasicMaterial color="#2b2926" />
          </mesh>
          <Line
            points={[
              [0, -0.095, 0],
              [0, -0.17, 0],
            ]}
            color="#2b2926"
            lineWidth={1.4}
          />
          <Line
            points={[
              [-0.44, -0.29, 0],
              [0, -0.17, 0],
              [0.44, -0.29, 0],
              [-0.44, -0.29, 0],
            ]}
            color="#2b2926"
            lineWidth={1.4}
          />
        </group>
      )}

      {/* Sombra falsa, atrás da peça (reaproveita a mesma textura) */}
      <mesh
        position={[0.04, -ALTURA_FOTO / 2 - deslocamentoFoto - 0.03, -0.03]}
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
        <planeGeometry args={[largura + 0.15, ALTURA_FOTO + 0.1]} />
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
  const { size, camera, viewport } = useThree();
  const estreito = size.width < 640;

  // Câmera: mais perto no desktop, mais longe no celular.
  useEffect(() => {
    camera.position.set(0, 0.3, estreito ? 7 : 5.2);
    camera.updateProjectionMatrix();
  }, [estreito, camera]);

  // A barra é fina e termina antes das bordas, com uma ponta quadrada de cada lado.
  const comprimento = viewport.width * (estreito ? 0.92 : 0.86);

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[0, 4, 5]} intensity={1.2} />

      <group position={[0, Y_BARRA, -0.12]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, comprimento, 16]} />
          <meshStandardMaterial color="#c9c6bf" metalness={0.3} roughness={0.45} />
        </mesh>
        {[-1, 1].map((lado) => (
          <mesh key={lado} position={[(lado * comprimento) / 2, 0, 0]}>
            <boxGeometry args={[0.05, 0.14, 0.05]} />
            <meshStandardMaterial color="#b8b5ae" metalness={0.3} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {produtos.map((produto, indice) => (
        <Suspense key={produto.id} fallback={null}>
          <Roupa3D
            produto={produto}
            indice={indice}
            indiceAtivo={indiceAtivo}
            total={produtos.length}
            estreito={estreito}
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

  // A mensagem "Adicionado" some sozinha.
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
      className="relative isolate w-full overflow-hidden text-[#242321] outline-none focus-visible:ring-2 focus-visible:ring-black/40"
      style={{ background: COR_FUNDO }}
    >
      <style>{`
        @keyframes agape-entrar { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes agape-rolar { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .agape-entrar { animation: agape-entrar .4s ease-out both; }
        .agape-faixa { display: inline-block; white-space: nowrap; animation: agape-rolar 45s linear infinite; }
        .agape-canvas canvas { touch-action: pan-y !important; }
        @media (prefers-reduced-motion: reduce) { .agape-entrar, .agape-faixa { animation: none; } }
      `}</style>

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
          {/* Selo pequeno no alto */}
          <div className="relative z-10 flex items-center justify-center gap-4 px-5 pt-10 text-[10px] font-medium uppercase tracking-[0.28em] sm:pt-14 sm:text-[11px]">
            <span className="text-[#242321]">{SELO_ESQUERDA}</span>
            <span aria-hidden="true" className="h-3 w-px bg-black/25" />
            <span className="text-[#8b8780]">{SELO_DIREITA}</span>
          </div>

          <div
            className="agape-canvas relative mx-auto -mt-2 h-[340px] w-full max-w-[1500px] sm:h-[520px]"
            onPointerDown={aoTocarInicio}
            onPointerUp={aoTocarFim}
            onPointerCancel={() => (toqueInicial.current = null)}
          >
            <Canvas
              camera={{ position: [0, 0.3, 5.2], fov: 38 }}
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

            {/* Setas só no celular; no computador, passe o mouse sobre as peças */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navegar(-1)}
                  aria-label="Peça anterior"
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl shadow-sm sm:hidden"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => navegar(1)}
                  aria-label="Próxima peça"
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl shadow-sm sm:hidden"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Duas linhas pequenas e um botão discreto */}
          <div
            key={produtoCentral.id}
            className="agape-entrar relative z-10 flex flex-col items-center gap-1 px-5 pb-10 text-center"
          >
            <p className="text-[12px] font-medium sm:text-[13px]">
              {produtoCentral.name}
            </p>
            <p className="text-[11px] text-[#8b8780]">
              {formatarPreco(produtoCentral.price, produtoCentral.currency || "brl")}
            </p>

            <button
              type="button"
              onClick={abrir}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-black/20 px-5 text-[11px] font-medium tracking-wide transition-colors hover:bg-black hover:text-white"
            >
              Explorar peça
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Faixa vermelha com texto rolando */}
          <div
            aria-hidden="true"
            className="overflow-hidden text-white"
            style={{ background: COR_DESTAQUE }}
          >
            <div className="agape-faixa py-2.5 text-[10px] font-medium tracking-wide sm:text-[11px]">
              {[0, 1].map((copia) => (
                <span key={copia}>
                  {[...FAIXA, ...FAIXA, ...FAIXA].map((texto, i) => (
                    <span key={i}>
                      {texto}
                      <span className="mx-8">✦</span>
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