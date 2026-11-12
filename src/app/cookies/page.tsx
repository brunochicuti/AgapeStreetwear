import type { Metadata } from "next";
import CookiePolicyContent from "@/src/app/components/CookiePolicyContent";

export const metadata: Metadata = {
  title: "Política de Cookies | Agape Streetwear",
  description:
    "Entenda como a Agape Streetwear utiliza cookies e tecnologias semelhantes.",
};

export default function CookiesPage() {
  return <CookiePolicyContent />;
}
