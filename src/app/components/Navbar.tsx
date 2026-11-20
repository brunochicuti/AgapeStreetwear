
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Home, PackageSearch, MessageCircle } from "lucide-react";
import Cart from "./Cart";

const navItems = [
  {
    label: "Início",
    href: "/",
    icon: Home,
  },
  {
    label: "Acompanhar pedido",
    href: "/acompanhar-pedido",
    icon: PackageSearch,
  },
  {
    label: "Contato",
    href: "/#contato",
    icon: MessageCircle,
  },
];

function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-black border-b border-white/10">
      <nav className="max-w-[1600px] mx-auto px-4 md:px-8 min-h-[76px] flex flex-wrap items-center justify-between gap-3 py-3">

        {/* LOGO */}
        <Link
          href="/"
          className="text-white font-bold text-xl md:text-2xl tracking-tight uppercase"
        >
          AGAPE
          <span className="text-red-600">.</span>
        </Link>

        {/* NAVEGAÇÃO */}
        <div className="flex items-center justify-center gap-1 md:gap-3 order-3 md:order-2 w-full md:w-auto">

          {navItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/acompanhar-pedido"
                  ? pathname === "/acompanhar-pedido"
                  : false;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative"
              >
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className={`
                    relative flex items-center gap-2
                    px-3 md:px-4 py-2.5 rounded-full
                    text-[10px] md:text-xs font-semibold
                    uppercase tracking-wider
                    transition-colors duration-300
                    ${
                      isActive
                        ? "bg-red-600/15 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <Icon size={15} />

                  <span>{item.label}</span>

                  {isActive && (
                    <motion.span
                      layoutId="activeNavbar"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-red-600 rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}

        </div>

        {/* AÇÕES */}
        <div className="flex items-center gap-4 order-2 md:order-3">

          <Cart />

          <Show when="signed-in">
            <UserButton />
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="
                hidden sm:block
                px-4 py-2 rounded-full
                border border-white/20
                text-white text-xs font-semibold uppercase
                tracking-wider
                transition-all duration-300
                hover:bg-white hover:text-black
              ">
                Fazer login
              </button>
            </SignInButton>
          </Show>

        </div>

      </nav>
    </header>
  );
}

export default Navbar;
