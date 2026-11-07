import { ProductType } from "@/src/types/ProductType";
import ProductImage from "./ProductImage";
import { formatPrice } from "@/src/lib/utils";
import AddCart from "./AddCart";
import Link from "next/link";

type ProductProps = {
  product: ProductType;
};

function corDaEtiqueta(etiqueta: string) {
  if (/esgot/i.test(etiqueta)) return "bg-neutral-500 text-white";
  if (/[uú]ltim/i.test(etiqueta)) return "bg-[#E01E2B] text-white";
  if (/mais vendido/i.test(etiqueta)) return "bg-white text-[#E01E2B]";
  return "bg-black text-white";
}

export default function Product({ product }: ProductProps) {
  const esgotado = product.etiqueta === "ESGOTADO";

  const card = (
    <div
      className={`flex flex-col shadow-lg h-96 bg-neutral-800 p-5 text-gray-300 ${
        esgotado ? "opacity-60" : ""
      }`}
    >
      <div className="relative max-h-72 flex-1">
        <ProductImage product={product} fill />

        {product.etiqueta && (
          <span
            className={`absolute left-0 top-0 z-10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${corDaEtiqueta(
              product.etiqueta
            )}`}
          >
            {product.etiqueta}
          </span>
        )}
      </div>

      <div className="flex justify-between font-bold my-3">
        <h2 className="text-[17px] font-semibold leading-6 text-white">
          {product.name}
        </h2>
        <p className="text-[20px] font-bold text-white">
          {formatPrice(product.price)}
        </p>
      </div>

      {/* O AddCart já vira "Esgotado" e fica desativado sozinho */}
      <AddCart product={product} />
    </div>
  );

  // Esgotado: não é link, então não abre a página do produto.
  if (esgotado) {
    return <div className="cursor-not-allowed">{card}</div>;
  }

  return <Link href={`/product/${product.id}`}>{card}</Link>;
}