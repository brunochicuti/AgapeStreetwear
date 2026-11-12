import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { CookiePanel } from "./components/ui/cookie-banner-1";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import Hydrate from "./components/Hydrate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agape Streetwear",
  description: "Agape Streetwear — moda urbana.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider localization={ptBR}>
      <html
        lang="pt-BR"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground`}>
          <Hydrate>
            <Navbar />
            <main>{children}</main>
            <CookiePanel />
          </Hydrate>
        </body>
      </html>
    </ClerkProvider>
  );
}

