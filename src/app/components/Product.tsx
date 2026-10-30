import { ProductType } from "@/types/ProducType"
import ProductImage from './ProductImage';
import { Space_Grotesk } from "next/font/google";
import {formatPrice} from "@/src/lib/utils";  

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
});

type ProductProps = {
    product: ProductType
}
export default function Product({product}: ProductProps){
    return(
        <div className="flex flex-col shadow-lg h-96 bg-neutral-800 p-5 text-gray-300">
            <div className="relative max-h-72 flex-1">
                <ProductImage product={product} fill/>
            </div>
            <div className="flex justify-between font-bold my-3">
                <h2 className="text-[17px] font-semibold leading-6 text-white ">
                {product.name}
                </h2>
                <p className="text-[20px] font-bold text-white">
                    {formatPrice(product.price)}
                </p>
                </div>
            <button className={`${spaceGrotesk.className} rounded-md bg-white text-black p-3.5 py-2.5 text-center font-bold uppercase tracking-[0.1em]`}>Adicionar à sacola</button>
        </div>
    )
}