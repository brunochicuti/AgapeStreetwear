import { connection } from "next/server";
import { fetchProducts } from "./actions";
import ClosetAgape from "@/src/app/components/ClosetAgape";

export default async function Home() {
  await connection();

  const { formatedProducts } = await fetchProducts({});

  return <ClosetAgape  products={formatedProducts} />;
}