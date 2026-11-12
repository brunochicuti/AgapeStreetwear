export type ProductType ={
    id: string;
    price:number | null;
    name: string;
    quantity?: number;
    image:string;
    description:string | null;
    currency?:string;
    etiqueta?: string | null;
    estoque?: number | null;
}