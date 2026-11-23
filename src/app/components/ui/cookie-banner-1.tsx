
"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

interface CookiePanelProps {
  title?: string;
  message?: string;
  className?: string;
}

const STORAGE_KEY = "agape_cookie_notice_ack_v1";

export function CookiePanel({
  title = "Sua privacidade importa",
  message = "Utilizamos cookies e armazenamento no navegador para manter sua conta segura, permitir compras e guardar os produtos do seu carrinho.",
  className = "",
}: CookiePanelProps) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(STORAGE_KEY);
      setVisible(acknowledged !== "true");
    } catch {
      setVisible(true);
    }

    setReady(true);
  }, []);

  function dismissNotice() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // O aviso continua podendo ser fechado nesta sessão.
    }

    setVisible(false);
  }

  function openNotice() {
    setVisible(true);
  }

  if (!ready) return null;

  return (
    <>
      {visible && (
        <div
          className={`fixed bottom-4 right-4 z-[100] w-[380px] max-w-[calc(100vw-2rem)] md:bottom-6 md:right-6 ${className}`}
        >
          <section
            role="dialog"
            aria-label="Aviso sobre cookies e armazenamento"
            aria-modal="false"
            className="rounded-xl border border-white/10 bg-[#111111] p-4 text-white shadow-2xl shadow-black/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#863D3D]/20 text-[#D59A9A] ring-1 ring-[#863D3D]/40">
                <Cookie className="size-5" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C88B8B]">
                  Agape Streetwear
                </p>
                <h2 className="text-sm font-semibold leading-5">
                  {title}
                </h2>
              </div>

              <button
                type="button"
                onClick={dismissNotice}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Fechar aviso de cookies"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-neutral-400">
              {message} Consulte nossa{" "}
              <a
                href="/cookies"
                className="text-white underline underline-offset-4 hover:text-[#D59A9A]"
              >
                Política de Cookies
              </a>{" "}
              e nossa{" "}
              <a
                href="/privacidade"
                className="text-white underline underline-offset-4 hover:text-[#D59A9A]"
              >
                Política de Privacidade
              </a>
              .
            </p>

            <button
              type="button"
              onClick={dismissNotice}
              className="mt-4 w-full rounded-md bg-[#863D3D] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6F3030]"
            >
              Entendi
            </button>
          </section>
        </div>
      )}

      {!visible && (
        <button
          type="button"
          onClick={openNotice}
          className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-full border border-white/15 bg-[#111111] px-4 py-3 text-xs font-semibold text-white shadow-xl transition hover:border-[#863D3D] hover:text-[#D59A9A]"
          aria-label="Consultar informações sobre cookies"
        >
          <Cookie className="size-4" />
          Cookies
        </button>
      )}
    </>
  );
}
