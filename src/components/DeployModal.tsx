"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Rocket, Copy, Check, ExternalLink, Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeployStatus = "idle" | "building" | "deployed" | "error";

/**
 * Modal de despliegue: publica el proyecto en un enlace público real,
 * servido por esta misma instancia de V.E.R.A en /p/[code] (el código va
 * codificado en la URL, sin base de datos ni infraestructura externa) —
 * un enlace de verdad, no una simulación visual. La integración con
 * Vercel/Netlify se deja honestamente marcada como no conectada: requiere
 * autorizar una cuenta externa que este entorno no tiene.
 */
export function DeployModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function deploy() {
      setStatus("building");
      // Pausa deliberada y breve solo por claridad de UX (empaquetar el
      // proyecto es casi instantáneo) — no simula un build remoto real.
      await new Promise((resolve) => setTimeout(resolve, 900));
      try {
        const response = await fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = (await response.json()) as { path?: string; error?: string };
        if (cancelled) return;
        if (!data.path) throw new Error(data.error ?? "Sin ruta de despliegue");
        setUrl(`${window.location.origin}${data.path}`);
        setStatus("deployed");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    deploy();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-hud-cyan/25 bg-slate-950/95 p-5 shadow-[0_0_60px_-12px_rgba(0,240,255,0.4)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-semibold text-hud-cyan">
            <Rocket className="h-4 w-4" />
            Desplegar en vivo
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "building" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-hud-cyan" />
            <p className="font-mono text-xs text-muted-foreground">Empaquetando tu proyecto…</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">No se pudo publicar el proyecto. Inténtalo de nuevo.</p>
          </div>
        )}

        {status === "deployed" && url && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              <Radio className="h-3.5 w-3.5" />
              <span className="font-mono font-semibold">Deployed</span>
              <span className="text-emerald-400/70">· en vivo, servido por esta instancia de V.E.R.A</span>
            </div>

            <div className="flex justify-center rounded-lg bg-white p-3">
              <QRCodeSVG value={url} size={140} />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-hud-cyan/20 bg-white/[0.03] px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs text-hud-cyan">{url}</span>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 shrink-0 text-hud-cyan">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <a href={url} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-hud-cyan">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 opacity-60">
              <p className="text-xs font-semibold text-foreground/80">Conectar con Vercel / Netlify</p>
              <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                No conectado en este entorno — requiere autorizar tu cuenta para publicar con dominio propio y SSL
                automático.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
