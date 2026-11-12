"use client";

import { useEffect, useState } from "react";
import {
  Cookie,
  Shield,
  X,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

type Prefs = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

interface CookiePanelProps {
  title?: string;
  message?: string;
  className?: string;
}

const STORAGE_KEY = "agape_cookie_preferences_v1";

export function CookiePanel({
  title = "Sua privacidade importa",
  message = "Utilizamos cookies para manter sua conta segura, permitir compras e melhorar sua experiência. Você escolhe quais categorias opcionais autoriza.",
  className = "",
}: CookiePanelProps) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const [prefs, setPrefs] = useState<Prefs>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        setPrefs({
          necessary: true,
          functional: parsed.functional === true,
          analytics: parsed.analytics === true,
          marketing: parsed.marketing === true,
        });
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }

    setReady(true);
  }, []);

  function hidePanel() {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  setShowPrefs(false);
  setVisible(false);
}

  function savePreferences(nextPrefs: Prefs) {
    const finalPrefs: Prefs = {
      ...nextPrefs,
      necessary: true,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs));
    } catch {
      // A loja continua funcionando mesmo se o navegador bloquear o armazenamento.
    }

    setPrefs(finalPrefs);
    hidePanel();
  }

  function acceptAll() {
    savePreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  }

  function rejectOptional() {
    savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  }

  function updatePreference(field: keyof Prefs) {
    if (field === "necessary") return;

    setPrefs((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  if (!ready) return null;

  const PreferenceRow = ({
    title,
    description,
    field,
    locked = false,
  }: {
    title: string;
    description: string;
    field: keyof Prefs;
    locked?: boolean;
  }) => (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <button
        type="button"
        disabled={locked}
        onClick={() => updatePreference(field)}
        aria-pressed={prefs[field]}
        aria-label={`Preferência de cookies: ${title}`}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition ${
          prefs[field]
            ? "border-[#863D3D] bg-[#863D3D] text-white"
            : "border-white/30 bg-transparent"
        } ${locked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
      >
        {prefs[field] && <Check className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white">
          {title}
          {locked && (
            <span className="text-[10px] font-medium text-[#C88B8B]">
              Sempre ativos
            </span>
          )}
        </div>

        <p className="mt-1 text-[11px] leading-4 text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`fixed bottom-4 right-4 z-[100] w-[380px] max-w-[calc(100vw-2rem)] md:bottom-6 md:right-6 ${
          visible ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!visible}
      >
        <section
          role="dialog"
          aria-label="Preferências de cookies"
          aria-modal="false"
          className={`rounded-xl border border-white/10 bg-[#111111] p-4 text-white shadow-2xl shadow-black/40 transition-all duration-300 ease-out ${
            visible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          } ${className}`}
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
              onClick={hidePanel}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar aviso de cookies"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-neutral-400">
            {message} Consulte nossa{" "}
            <a
              href="/privacidade"
              className="text-white underline underline-offset-4 hover:text-[#D59A9A]"
            >
              Política de Privacidade
            </a>{" "}
            e nossos{" "}
            <a
              href="/termos"
              className="text-white underline underline-offset-4 hover:text-[#D59A9A]"
            >
              Termos de Uso
            </a>
            .
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrefs((current) => !current)}
              aria-expanded={showPrefs}
              aria-controls="agape-cookie-preferences"
              className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-white/10"
            >
              Personalizar
              {showPrefs ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={rejectOptional}
              className="rounded-md border border-white/15 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-white/10"
            >
              Rejeitar opcionais
            </button>

            <button
              type="button"
              onClick={acceptAll}
              className="rounded-md bg-[#863D3D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#6F3030]"
            >
              Aceitar todos
            </button>
          </div>

          <div
            id="agape-cookie-preferences"
            className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
            style={{
              maxHeight: showPrefs ? "420px" : "0px",
              opacity: showPrefs ? 1 : 0,
            }}
            aria-hidden={!showPrefs}
          >
            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
              <div className="mb-1 flex items-center gap-2">
                <Shield className="size-4 text-[#C88B8B]" />
                <p className="text-xs font-semibold text-white">
                  Suas preferências
                </p>
              </div>

              <PreferenceRow
                title="Necessários"
                description="Login, segurança e funcionamento da loja."
                field="necessary"
                locked
              />

              <PreferenceRow
                title="Funcionais"
                description="Memorizam suas preferências."
                field="functional"
              />

              <PreferenceRow
                title="Análise"
                description="Ajudam a entender e melhorar a experiência."
                field="analytics"
              />

              <PreferenceRow
                title="Marketing"
                description="Permitem publicidade e ofertas personalizadas."
                field="marketing"
              />

              <button
                type="button"
                onClick={() => savePreferences(prefs)}
                className="mt-2 w-full rounded-md bg-[#863D3D] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6F3030]"
              >
                Salvar minhas preferências
              </button>
            </div>
          </div>
        </section>
      </div>

      {!visible && (
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-full border border-white/15 bg-[#111111] px-4 py-3 text-xs font-semibold text-white shadow-xl transition hover:border-[#863D3D] hover:text-[#D59A9A]"
          aria-label="Abrir preferências de cookies"
        >
          <Cookie className="size-4" />
          Cookies
        </button>
      )}
    </>
  );
}
