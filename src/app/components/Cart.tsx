
"use client";

import { useCartStore } from "@/src/store";
import CartDrawer from "./CartDrawer";
import { ShoppingBag } from "lucide-react";

export default function Cart() {
  const useStore = useCartStore();

  return (
    <>
      <button
        onClick={() => useStore.toggleCart()}
        type="button"
        aria-label="Abrir sacola"
        className="
          flex items-center gap-2
          px-4 py-2.5
          rounded-full
          border border-white/20
          bg-white/5
          text-white
          font-semibold
          uppercase tracking-wider
          text-xs
          transition-all duration-300
          hover:border-red-600
          hover:bg-red-600/10
        "
      >
        <ShoppingBag size={17} strokeWidth={1.8} />

        <span>Sacola ({useStore.cart?.length ?? 0})</span>
      </button>

      {useStore.isOpen && <CartDrawer />}
    </>
  );
}
