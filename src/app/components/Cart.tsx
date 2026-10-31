"use client";
import { useCartStore } from '@/src/store';
import CartDrawer from './CartDrawer';
export default function Cart(){
    const useStore = useCartStore();
    return(
            <>
                <button
                onClick={() => useStore.toggleCart()}
                type="button"
                className="ml-auto cursor-pointer flex items-center gap-3 bg-white px-5 py-3 text-black font-semibold uppercase tracking-wider text-sm hover:bg-gray-200 transition">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    >
                    <path d="M5.5 8h13l-1 12h-11l-1-12Z" />
                    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                    </svg>
                    <span>Sacola ({useStore.cart?.length})</span>
                 </button>
                    {
                    useStore.isOpen && (
                        <CartDrawer/>
                    )}
            </>
    )
}