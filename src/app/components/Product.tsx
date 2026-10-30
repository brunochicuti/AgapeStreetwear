import { ProductType } from "@/types/ProducType"
import ProductImage from './ProductImage';
import {formatPrice} from "@/src/lib/utils";  
import AddCart from "./AddCart"
import Link from "next/link";

type ProductProps = {
    product: ProductType
}
export default function Product({product}: ProductProps){
    return(
        <Link href={`/product/${product.id}`}>
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
                    <AddCart product={product}/>
            </div>
        </Link>
    )
}