import { connection } from "next/server";
import { fetchProducts } from "./actions";
import ClothingRailHeroDemo from "@/src/app/components/ClothingRailDemo";
export default async function Home() {
  await connection();

  const { formatedProducts } = await fetchProducts({});

  return <ClothingRailHeroDemo />
}