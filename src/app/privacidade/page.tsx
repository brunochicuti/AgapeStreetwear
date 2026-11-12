import type { Metadata } from "next";
import PrivacyContent from "@/src/app/components/PrivacyContent";

export const metadata: Metadata = {
  title: "Política de Privacidade | Agape Streetwear",
  description:
    "Saiba como a Agape Streetwear coleta, utiliza e protege seus dados pessoais.",
};

export default function PrivacidadePage() {
  return <PrivacyContent />;
}
