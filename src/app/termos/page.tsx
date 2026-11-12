import type { Metadata } from "next";
import TermsContent from "@/src/app/components/TermsContent";

export const metadata: Metadata = {
  title: "Termos de Uso | Agape Streetwear",
  description:
    "Consulte os Termos de Uso da loja virtual Agape Streetwear.",
};

export default function TermosPage() {
  return <TermsContent />;
}
