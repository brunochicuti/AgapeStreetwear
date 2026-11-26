
"use client";

import { useEffect, useState } from "react";

type Produto = {
  id: string;
  name: string;
  image: string;
};

type Imagem = {
  id: string;
  stripeProductId: string;
  angle: "FRENTE" | "LADO" | "COSTAS";
  url: string;
  publicId: string;
  updatedAt: string;
};

const ANGULOS = [
  { id: "FRENTE", nome: "Frente" },
  { id: "LADO", nome: "Lado" },
  { id: "COSTAS", nome: "Costas" },
] as const;

export default function BibliotecaImagens() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function carregarImagens() {
    const resposta = await fetch("/api/admin/imagens", {
      cache: "no-store",
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.error || "Erro ao carregar imagens.");
    }

    setImagens(dados.images || []);
  }

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErro("");

        const [resProdutos, resImagens] = await Promise.all([
          fetch("/api/admin/produtos", { cache: "no-store" }),
          fetch("/api/admin/imagens", { cache: "no-store" }),
        ]);

        const dadosProdutos = await resProdutos.json();
        const dadosImagens = await resImagens.json();

        if (!resProdutos.ok) {
          throw new Error(
            dadosProdutos.error || "Erro ao carregar produtos."
          );
        }

        if (!resImagens.ok) {
          throw new Error(
            dadosImagens.error || "Erro ao carregar imagens."
          );
        }

        setProdutos(dadosProdutos.products || []);
        setImagens(dadosImagens.images || []);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a biblioteca."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  async function enviarImagem(
    angle: "FRENTE" | "LADO" | "COSTAS",
    file: File
  ) {
    if (!produtoSelecionado) return;

    setErro("");
    setMensagem("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErro("Use uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErro("A imagem não pode ultrapassar 5 MB.");
      return;
    }

    try {
      setEnviando(angle);

      const formData = new FormData();
      formData.append("stripeProductId", produtoSelecionado);
      formData.append("angle", angle);
      formData.append("file", file);

      const resposta = await fetch("/api/admin/imagens", {
        method: "POST",
        body: formData,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.error || "Não foi possível enviar a imagem.");
      }

      await carregarImagens();
      setMensagem(`Imagem de ${angle.toLowerCase()} atualizada com sucesso.`);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao enviar a imagem."
      );
    } finally {
      setEnviando("");
    }
  }

  async function copiarUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMensagem("URL copiada com sucesso.");
      setErro("");
    } catch {
      setErro("Não foi possível copiar a URL.");
      setMensagem("");
    }
  }

  const imagensDoProduto = imagens.filter(
    (imagem) => imagem.stripeProductId === produtoSelecionado
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Biblioteca de imagens
        </h2>

        <p className="mt-1 text-sm text-neutral-400">
          Gerencie as imagens dos produtos e seus diferentes ângulos.
        </p>
      </div>

      {carregando ? (
        <p className="text-sm text-neutral-400">
          Carregando produtos e imagens...
        </p>
      ) : erro && produtos.length === 0 ? (
        <p className="text-sm text-red-400">{erro}</p>
      ) : (
        <>
          <div className="max-w-xl space-y-2">
            <label
              htmlFor="produto-imagens"
              className="block text-sm font-medium text-neutral-300"
            >
              Selecione um produto
            </label>

            <select
              id="produto-imagens"
              value={produtoSelecionado}
              onChange={(event) => {
                setProdutoSelecionado(event.target.value);
                setErro("");
                setMensagem("");
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-400"
            >
              <option value="">Escolha um produto...</option>

              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.name}
                </option>
              ))}
            </select>
          </div>

          {produtos.length === 0 && (
            <p className="text-sm text-neutral-400">
              Nenhum produto ativo foi encontrado no Stripe.
            </p>
          )}

          {erro && <p className="text-sm text-red-400">{erro}</p>}
          {mensagem && (
            <p className="text-sm text-green-400">{mensagem}</p>
          )}

          {produtoSelecionado && (
            <>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                <h3 className="font-medium text-white">
                  {produtos.find(
                    (produto) => produto.id === produtoSelecionado
                  )?.name}
                </h3>

                <p className="mt-1 text-sm text-neutral-400">
                  {imagensDoProduto.length} de 3 imagens cadastradas
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {ANGULOS.map((angulo) => {
                  const imagem = imagensDoProduto.find(
                    (item) => item.angle === angulo.id
                  );

                  return (
                    <div
                      key={angulo.id}
                      className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
                    >
                      <div>
                        <h3 className="font-medium text-white">
                          {angulo.nome}
                        </h3>

                        <p className="text-xs text-neutral-500">
                          {imagem ? "Imagem cadastrada" : "Nenhuma imagem"}
                        </p>
                      </div>

                      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
                        {imagem ? (
                          <img
                            src={imagem.url}
                            alt={`${angulo.nome} do produto`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-sm text-neutral-600">
                            Sem imagem
                          </span>
                        )}
                      </div>

                      <label className="flex cursor-pointer items-center justify-center rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">
                        {enviando === angulo.id
                          ? "Enviando..."
                          : imagem
                            ? "Substituir imagem"
                            : "Adicionar imagem"}

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={Boolean(enviando)}
                          onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                              void enviarImagem(angulo.id, file);
                            }

                            event.target.value = "";
                          }}
                        />
                      </label>

                      {imagem && (
                        <button
                          type="button"
                          onClick={() => void copiarUrl(imagem.url)}
                          className="w-full rounded-md px-3 py-2 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                        >
                          Copiar URL da imagem
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-neutral-500">
                Formatos aceitos: JPG, PNG e WebP. Tamanho máximo: 5 MB por
                imagem.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
