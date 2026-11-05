"use client";

import { useState } from "react";
import { useCartStore } from "@/src/store";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

type CheckoutButtonProps = {
  totalPrice: number;
};

export default function CheckoutButton({ totalPrice }: CheckoutButtonProps) {
  const setCheckout = useCartStore((state) => state.setCheckout);
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const toggleCart = useCartStore((state) => state.toggleCart);

  const [finalizando, setFinalizando] = useState(false);

  const handleCheckout = () => {
    if (!isLoaded || finalizando) return;

    if (!user) {
      toggleCart();
      router.push("/sign-in?redirectUrl=/checkout");
      return;
    }

    setCheckout("checkout");
    setFinalizando(true);
    router.push("/checkout");
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={!isLoaded || finalizando}
      className={`mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#24231f] px-6 py-4 text-sm font-medium text-white transition hover:bg-[#45423c] ${
        finalizando ? "pointer-events-none opacity-70" : ""
      }`}
    >
      {finalizando ? "Abrindo checkout..." : "Finalizar compra"}
      <ArrowRight size={17} />
    </button>
  );
}