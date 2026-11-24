
"use client";

import { usePathname } from "next/navigation";
import FuzzyCritterFooter, {
  type Critter,
  type FooterColumn,
  type FooterLink,
} from "./ui/fuzzy-critter-footer";

const CRITTERS: Critter[] = [
  {
    shape: "cloud",
    colors: ["#525252", "#d4d4d4"],
    eyes: "dashes",
    size: 1.08,
  },
  {
    shape: "flower",
    colors: ["#7f1d1d", "#ef4444"],
    eyes: "short",
    size: 0.9,
  },
  {
    shape: "cube",
    colors: ["#737373", "#f5f5f5"],
    eyes: "pills",
    size: 1.05,
  },
  {
    shape: "triangle",
    colors: ["#991b1b", "#fca5a5"],
    eyes: "short",
    size: 1,
  },
];

const COLUMNS: FooterColumn[] = [
  {
    title: "Loja",
    links: [
      { label: "Início", href: "/" },
      { label: "Produtos", href: "/product" },
      { label: "Acompanhar pedido", href: "/acompanhar-pedido" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { label: "Termos de uso", href: "/termos" },
      { label: "Privacidade", href: "/privacidade" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
  {
    title: "Minha conta",
    links: [
      { label: "Entrar", href: "/sign-in" },
      { label: "Criar conta", href: "/sign-up" },
    ],
  },
];

const LEGAL: FooterLink[] = [
  { label: "Privacidade", href: "/privacidade" },
  { label: "Termos", href: "/termos" },
];

export default function SiteFooter() {
  const pathname = usePathname();

  const hiddenRoutes = [
    "/admin",
    "/checkout",
    "/pedido-confirmado",
    "/sign-in",
    "/sign-up",
  ];

  if (
    hiddenRoutes.some(
      (route) => pathname === route || pathname?.startsWith(`${route}/`),
    )
  ) {
    return null;
  }

  return (
    <FuzzyCritterFooter
      wordmark="AGAPE"
      name="AGAPE STREETWEAR"
      tagline="Vista sua atitude. Viva seu estilo."
      columns={COLUMNS}
      legal={LEGAL}
      copyright="© 2026 Agape Streetwear. Todos os direitos reservados."
      critters={CRITTERS}
      density={0.5}
      sound={false}
      idleHops={true}
      dropLabel="Soltar novamente"
    />
  );
}
