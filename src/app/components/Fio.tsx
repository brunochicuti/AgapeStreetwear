
"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Image, useTexture } from "@react-three/drei";
import * as THREE from "three";
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

function Roupa3D({
  produto,
  indice,
  ativo,
  quantidade,
  aoSelecionar,
}: {
  produto: ProductType;
  indice: number;
  ativo: boolean;
  quantidade: number;
  aoSelecionar: () => void;
}) {
  const ref = useRef<THREE.Group>(null);

  const textura = useTexture(produto.image);

  const proporcao = useMemo(() => {
    const imagem = textura.image as HTMLImageElement;
    if (!imagem?.width || !imagem?.height) return 0.78;

    return imagem.width / imagem.height;
  }, [textura]);

  const largura = Math.min(1.5, Math.max(0.85, proporcao * 1.65));

  useFrame((_, delta) => {
    if (!ref.current) return;

    const velocidade = 1 - Math.exp(-5 * delta);

    const deslocamento = indice - ativoIndexRef.current;
    const alvoX = deslocamento * 1.55;
    const alvoY = ativo ? 0.05 : -0.12;
    const alvoZ = ativo ? 0.8 : -Math.abs(deslocamento) * 0.12;
    const alvoRotacao = ativo ? 0 : Math.sign(deslocamento || 1) * 1.05;
    const alvoEscala = ativo ? 1.18 : 0.88;

    ref.current.position.x = THREE.MathUtils.lerp(
      ref.current.position.x,
      alvoX,
      velocidade
    );

    ref.current.position.y = THREE.MathUtils.lerp(
      ref.current.position.y,
      alvoY,
      velocidade
    );

    ref.current.position.z = THREE.MathUtils.lerp(
      ref.current.position.z,
      alvoZ,
      velocidade
    );

    ref.current.rotation.y = THREE.MathUtils.lerp(
      ref.current.rotation.y,
      alvoRotacao,
      velocidade
    );

    ref.current.scale.x = THREE.MathUtils.lerp(
      ref.current.scale.x,
      alvoEscala,
      velocidade
    );

    ref.current.scale.y = THREE.MathUtils.lerp(
      ref.current.scale.y,
      alvoEscala,
      velocidade
    );
  });

  return (
    <group
      ref={ref}
      onPointerOver={(event) => {
        event.stopPropagation();
        aoSelecionar();
      }}
      onClick={(event) => {
        event.stopPropagation();
        aoSelecionar();
      }}
    >
      {/* Cabide */}
      <group position={[0, 1.15, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[0.1, 0.018, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#b7b4ad" metalness={0.9} roughness={0.2} />
        </mesh>

        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.035, 0.5, 0.035]} />
          <meshStandardMaterial color="#aaa69e" metalness={0.85} roughness={0.25} />
        </mesh>

        <mesh position={[0, -0.27, 0]}>
          <boxGeometry args={[0.85, 0.035, 0.045]} />
          <meshStandardMaterial color="#a8a49c" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Fotografia da peça */}
      <Image
        url={produto.image}
        transparent
        scale={[largura, 1.75]}
        position={[0, -0.05, 0.04]}
        toneMapped={false}
      />

      {/* Área clicável */}
      <mesh position={[0, -0.05, -0.04]}>
        <planeGeometry args={[largura + 0.2, 1.95]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// Referência compartilhada para a animação das peças
const ativoIndexRef = { current: 0 };

function CenaCloset({
  produtos,
  indiceAtivo,
  selecionar,
}: {
  produtos: ProductType[];
  indiceAtivo: number;
  selecionar: (indice: number) => void;
}) {
  ativoIndexRef.current = indiceAtivo;

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[0, 5, 5]} intensity={2} />
      <directionalLight position={[-4, 2, -3]} intensity={0.7} />

      {/* Barra da arara */}
      <mesh position={[0, 1.55, -0.15]}>
        <cylinderGeometry args={[0.035, 0.035, 30, 24]} />
        <meshStandardMaterial
          color="#aaa69e"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {produtos.map((produto, indice) => (
        <Suspense key={produto.id} fallback={null}>
          <Roupa3D
            produto={produto}
            indice={indice}
            ativo={indice === indiceAtivo}
            quantidade={produtos.length}
            aoSelecionar={() => selecionar(indice)}
          />
        </Suspense>
      ))}
    </>
  );
}

export default function Fio({ products }: FioProps) {
  const addProduct = useCartStore((state) => state.addProduct);

  const [indice, setIndice] = useState(0);
  const [produtoAberto, setProdutoAberto] =
    useState<ProductType | null>(null);

  const produtosValidos = products.filter((produto) =>
    Boolean(produto.image)
  );

  if (produtosValidos.length === 0) return null;

  const total = produtosValidos.length;
  const produtoCentral = produtosValidos[indice] ?? produtosValidos[0];

  function navegar(direcao: number) {
    setIndice((atual) => (atual + direcao + total) % total);
  }

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#f7f5f1] text-[#242321]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,white_0%,#f7f5f1_65%,#eeeae3_100%)]" />

      {produtoAberto ? (
        <div className="mx-auto grid min-h-[650px] max-w-7xl grid-cols-1 items-center gap-8 px-5 py-12 sm:px-8 md:grid-cols-2 md:gap-14 md:px-12">
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl bg-white/60 p-5 sm:min-h-[480px] sm:p-10">
            <img
              src={produtoAberto.image}
              alt={produtoAberto.name}
              className="max-h-[480px] w-full object-contain drop-shadow-xl"
            />
          </div>

          <div className="mx-auto w-full max-w-lg">
            <button
              type="button"
              onClick={() => setProdutoAberto(null)}
              className="mb-10 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm"
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
              {formatarPreco(
                produtoAberto.price,
                produtoAberto.currency || "brl"
              )}
            </p>

            {produtoAberto.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#716b62]">
                {produtoAberto.description}
              </p>
            )}

            <button
              type="button"
              onClick={() => addProduct(produtoAberto)}
              className="mt-9 min-h-14 w-full rounded-full bg-[#22211f] px-7 py-4 text-sm font-medium text-white hover:bg-[#44413c]"
            >
              Adicionar à sacola
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="relative z-10 px-5 pb-1 pt-12 text-center sm:pt-16">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.38em] text-[#8b8174] sm:text-xs">
              AGAPE STREETWEAR
            </p>

            <h2 className="text-3xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
              Escolha sua próxima peça
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#827b72] sm:text-base">
              Explore a coleção e selecione a peça que combina com você.
            </p>
          </header>

          <div className="relative mx-auto h-[490px] w-full max-w-[1500px] sm:h-[590px]">
            <Canvas
              camera={{ position: [0, 0.5, 8], fov: 38 }}
              dpr={[1, 1.75]}
              gl={{ antialias: true, alpha: true }}
            >
              <CenaCloset
                produtos={produtosValidos}
                indiceAtivo={indice}
                selecionar={setIndice}
              />
            </Canvas>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navegar(-1)}
                  aria-label="Peça anterior"
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl shadow-md sm:left-6 sm:h-12 sm:w-12"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => navegar(1)}
                  aria-label="Próxima peça"
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl shadow-md sm:right-6 sm:h-12 sm:w-12"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <div className="relative z-10 flex flex-col items-center gap-5 pb-12">
            <p className="text-xs text-[#827b72]">
              {indice + 1} de {total} peças
            </p>

            <button
              type="button"
              onClick={() => setProdutoAberto(produtoCentral)}
              className="min-h-12 rounded-full bg-[#292722] px-8 py-3 text-sm font-medium text-white hover:bg-[#48453e]"
            >
              Ver detalhes da peça →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
