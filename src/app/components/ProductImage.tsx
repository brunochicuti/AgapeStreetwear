'use client'
import {useState} from "react";
import Image from 'next/image';
import { ProductType } from "@/src/types/ProductType";
import MagnifierLens from "./MagnifierLens";


type ProductImageProps = {
    product: ProductType;
    fill?:boolean;
    enableZoom?: boolean;
};


export default function ProductImage({
  product,
  fill,
  enableZoom = false,
}: ProductImageProps) {
  const [loading, setLoading] = useState(true);

  const imagem = fill ? (
    <Image
      src={product.image}
      fill
      alt={product.name}
      className={`object-cover transition-all duration-500 ${
        loading
          ? "scale-110 blur-3xl grayscale"
          : "scale-100 blur-0 grayscale-0"
      }`}
      onLoadingComplete={() => setLoading(false)}
    />
  ) : (
    <Image
      src={product.image}
      width={400}
      height={700}
      alt={product.name}
      className={`object-cover transition-all duration-500 ${
        loading
          ? "scale-110 blur-3xl grayscale"
          : "scale-100 blur-0 grayscale-0"
      }`}
      onLoadingComplete={() => setLoading(false)}
    />
  );

  if (enableZoom && fill) {
    return (
      <MagnifierLens zoomFactor={2} lensSize={170}>
        {imagem}
      </MagnifierLens>
    );
  }

  return imagem;
}
