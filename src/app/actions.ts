"use server";

import { stripe } from "../lib/stripe";

export async function fetchProducts({
  lastProductId,
}: {
  lastProductId?: string;
}) {
  const params = lastProductId
    ? { starting_after: lastProductId, limit: 10 }
    : { limit: 10 };

  const { data: products, has_more } =
    await stripe.products.list(params);

  const formatedProducts = await Promise.all(
    products
      .filter((product) => product.active)
      .map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100,
        });

        const activePrices = prices.data.filter(
          (price) =>
            price.currency === "brl" && price.unit_amount !== null
        );

        const price =
          activePrices.length === 1 ? activePrices[0] : null;

        return {
          id: product.id,
          price: price?.unit_amount ?? null,
          name: product.name,
          image: product.images[0] || "",
          description: product.description,
          currency: price?.currency ?? "brl",
        };
      })
  );

  return { formatedProducts, has_more };
}