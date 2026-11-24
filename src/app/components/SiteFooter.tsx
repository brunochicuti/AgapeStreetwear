
"use client";

import { usePathname } from "next/navigation";
import FuzzyCritterFooter, {
  type Critter,
  type FooterColumn,
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
    title: "EXPLORAR",
    links: [
      { label: "Início", href: "/" },
      { label: "Acompanhar pedido", href: "/acompanhar-pedido" },
    ],
  },
  {
    title: "INSTITUCIONAL",
    links: [
      { label: "Termos de uso", href: "/termos" },
      { label: "Privacidade", href: "/privacidade" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
  {
    title: "ATENDIMENTO",
    links: [
      {
        label: "Fale conosco",
        href: "https://wa.me/5567981617997?text=Ol%C3%A1%21%20Vim%20pelo%20site%20da%20Agape%20Streetwear%20e%20gostaria%20de%20saber%20mais%20sobre%20os%20produtos%20e%20receber%20atendimento.%20%F0%9F%98%8A",
      },
      {
        label: "Dúvidas sobre pedidos",
        href: "mailto:suporte@in.agapestreetwear.com.br",
      },
    ],
  },
  {
    title: "CONECTE-SE",
    links: [
      {
        label: "Instagram",
        href: "https://www.instagram.com/agape.streetwearr/",
      },
    ],
  },
];

const LEGAL: { label: string; href: string }[] = [];

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
