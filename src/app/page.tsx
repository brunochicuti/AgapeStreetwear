import Fio from "./components/Fio";
import { fetchProducts } from "./actions";

export default async function Home() {
  const {formatedProducts} = await fetchProducts({});

  return <Fio products={formatedProducts} />;
}
