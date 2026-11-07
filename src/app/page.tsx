import { ProductType } from "@/src/types/ProductType";
import { cacheLife } from "next/cache";
import ClothingRailHeroDemo from "./components/ClothingRailDemo";
import Stripe from "stripe";

/**
 * Etiqueta da peça (aparece pendurada na arara e no card).
 * Prioridade:
 *  1. metadata "estoque" = 0          -> ESGOTADO
 *  2. metadata "estoque" de 1 a 3     -> ÚLTIMAS UNIDADES
 *  3. metadata "etiqueta" (texto)     -> ex.: MAIS VENDIDO, DROP 01
 *  4. criado nos últimos 30 dias      -> NOVO
 */
function calcularEtiqueta(product: Stripe.Product): string | undefined {
  const estoque = product.metadata?.estoque?.trim();
  const qtd = estoque ? Number(estoque) : NaN;

  if (!Number.isNaN(qtd) && qtd <= 0) return "ESGOTADO";
  if (!Number.isNaN(qtd) && qtd <= 3) return "ÚLTIMAS UNIDADES";

  const manual = product.metadata?.etiqueta?.trim();
  if (manual) return manual.toUpperCase();

  const dias = (Date.now() / 1000 - product.created) / 86400;
  if (dias <= 30) return "NOVO";

  return undefined;
}

async function getProducts(): Promise<ProductType[]> {
  "use cache";
  cacheLife("minutes");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-09-30.endive",
  });

  const products = await stripe.products.list({ active: true });
  const formatedProducts = await Promise.all(
    products.data.map(async (product) => {
      const price = await stripe.prices.list({
        product: product.id,
      });
      return {
        id: product.id,
        price: price.data[0].unit_amount,
        name: product.name,
        image: product.images[0],
        description: product.description,
        currency: price.data[0]?.currency,
        etiqueta: calcularEtiqueta(product),
      };
    })
  );
  return formatedProducts;
}

export default async function Home() {
  const products = await getProducts();
  console.log("PRODUTOS:", JSON.stringify(products.map((p) => ({ id: p.id, name: p.name, etiqueta: p.etiqueta }))));

  return (
    <div className="w-full min-h-screen m-0 p-0 overflow-x-hidden bg-background">
      {/* Arara com largura total de ponta a ponta */}
      <ClothingRailHeroDemo products={products} />
    </div>
  );
}