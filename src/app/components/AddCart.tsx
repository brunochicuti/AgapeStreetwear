"use client";
import { Space_Grotesk } from "next/font/google";
import { useCartStore } from "@/src/store";
import { ProductType } from "@/types/ProductType";

const spaceGrotesk  = Space_Grotesk({
  subsets: ["latin"],
});

export default function Product({product}: {product: ProductType}){
    const {addProduct} = useCartStore();

    return(
            <button
            onClick={() => addProduct(product)}
            className={`${spaceGrotesk.className} rounded-md bg-white text-black p-3.5 py-2.5 text-center font-bold uppercase tracking-[0.1em]`}
            >
            Adicionar à sacola
            </button>
    )

}