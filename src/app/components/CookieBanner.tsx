"use client";

import { useEffect, useState } from "react";

type PreferenciasCookies = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "agape_cookie_preferences_v1";

export default function CookieBanner() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const preferences = JSON.parse(saved) as PreferenciasCookies;
        setAnalytics(preferences.analytics === true);
        setMarketing(preferences.marketing === true);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setOpen(true);
      }
    } else {
      setOpen(true);
    }

    setReady(true);
  }, []);

  function savePreferences(
    analyticsEnabled: boolean,
    marketingEnabled: boolean
  ) {
    const preferences: PreferenciasCookies = {
      necessary: true,
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

    setAnalytics(analyticsEnabled);
    setMarketing(marketingEnabled);
    setOpen(false);
    setCustomizing(false);
  }

  if (!ready) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-5 left-5 z-[100] w-[calc(100%-2.5rem)] max-w-[430px]">
          <section
            aria-label="Preferências de cookies"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-black shadow-2xl"
          >
            <div className="h-1.5 bg-[#863D3D]" />

            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF6F3] text-xl">
                  🍪
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#863D3D]">
                    Agape Streetwear
                  </p>
                  <h2 className="text-xl font-bold">
                    Sua privacidade importa
                  </h2>
                </div>
              </div>

              <p className="mb-5 text-sm leading-6 text-gray-600">
                Utilizamos cookies e tecnologias semelhantes para manter
                sua conta segura, permitir compras e melhorar sua experiência.
                Você pode escolher quais categorias opcionais autoriza.
              </p>

              {customizing && (
                <div className="mb-5 space-y-3 border-y border-gray-100 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        Necessários
                      </p>
                      <p className="text-xs text-gray-500">
                        Login, segurança e funcionamento da loja.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#863D3D]">
                      Sempre ativos
                    </span>
                  </div>

                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        Análise
                      </p>
                      <p className="text-xs text-gray-500">
                        Medição e melhoria da experiência.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(event) => setAnalytics(event.target.checked)}
                      className="h-5 w-5 accent-[#863D3D]"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        Marketing
                      </p>
                      <p className="text-xs text-gray-500">
                        Publicidade e ofertas personalizadas.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(event) => setMarketing(event.target.checked)}
                      className="h-5 w-5 accent-[#863D3D]"
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {!customizing ? (
                  <>
                    <button
                      onClick={() => savePreferences(true, true)}
                      className="w-full rounded-xl bg-[#863D3D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5C2A2A]"
                    >
                      Aceitar todos
                    </button>

                    <button
                      onClick={() => savePreferences(false, false)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      Rejeitar opcionais
                    </button>

                    <button
                      onClick={() => setCustomizing(true)}
                      className="w-full px-4 py-2 text-sm font-semibold text-[#863D3D] transition hover:underline"
                    >
                      Personalizar preferências
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => savePreferences(analytics, marketing)}
                      className="w-full rounded-xl bg-[#863D3D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5C2A2A]"
                    >
                      Salvar minhas preferências
                    </button>

                    <button
                      onClick={() => setCustomizing(false)}
                      className="w-full px-4 py-2 text-sm font-semibold text-gray-600 hover:underline"
                    >
                      Voltar
                    </button>
                  </>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-gray-500">
                Saiba mais na nossa{" "}
                <a
                  href="/cookies"
                  className="font-semibold text-[#863D3D] underline underline-offset-2"
                >
                  Política de Cookies
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      )}

      {!open && (
        <button
          onClick={() => {
            setCustomizing(true);
            setOpen(true);
          }}
          aria-label="Abrir preferências de cookies"
          className="fixed bottom-5 left-5 z-[90] rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-800 shadow-lg transition hover:border-[#863D3D] hover:text-[#863D3D]"
        >
          Preferências de cookies
        </button>
      )}
    </>
  );
}
