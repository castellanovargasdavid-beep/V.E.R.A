"use client";

import { useMemo, useState } from "react";
import { Monitor, RefreshCcw, Copy, Check, Download, Loader2, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPreviewHtml } from "@/lib/builder/prepare-preview";
import { buildProjectZip, downloadBlob } from "@/lib/builder/export-zip";
import { cn } from "@/lib/utils";

const VIEWPORTS = {
  mobile: { label: "Móvil", icon: Smartphone, width: "375px" },
  tablet: { label: "Tablet", icon: Tablet, width: "768px" },
  desktop: { label: "Escritorio", icon: Monitor, width: "100%" },
} as const;

type ViewportKey = keyof typeof VIEWPORTS;

export function LivePreview({
  code,
  isGenerating,
  onRefresh,
}: {
  code: string;
  isGenerating?: boolean;
  onRefresh?: () => void;
}) {
  const srcDoc = useMemo(() => buildPreviewHtml(code), [code]);
  const [viewport, setViewport] = useState<ViewportKey>("desktop");
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const hasCode = Boolean(code.trim());

  async function handleCopy() {
    if (!hasCode) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleDownload() {
    if (!hasCode || isZipping) return;
    setIsZipping(true);
    try {
      const blob = await buildProjectZip(code);
      downloadBlob(blob, "proyecto-vera.zip");
    } finally {
      setIsZipping(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          <span>Vista previa en vivo</span>
          {isGenerating && <span className="animate-pulse text-jarvis">· generando…</span>}
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7 gap-1 px-2 text-xs">
            <RefreshCcw className="h-3 w-3" />
            Refrescar
          </Button>
        )}
      </div>

      <div className="relative flex-1 overflow-auto bg-[#05070c] p-4">
        {/* Barra de herramientas flotante: copiar código, exportar a .zip y
            cambiar el ancho simulado del viewport, sin ocupar espacio fijo
            en el layout — flota sobre la propia vista previa. */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-hud-cyan/20 bg-slate-900/70 p-1 shadow-lg backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            disabled={!hasCode}
            title="Copiar código"
            className="h-7 w-7 text-hud-cyan hover:bg-hud-cyan/10 hover:text-hud-cyan"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={!hasCode || isZipping}
            title="Descargar proyecto (.zip)"
            className="h-7 w-7 text-hud-cyan hover:bg-hud-cyan/10 hover:text-hud-cyan"
          >
            {isZipping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>

          <div className="mx-1 h-4 w-px bg-hud-cyan/20" />

          {(Object.entries(VIEWPORTS) as [ViewportKey, (typeof VIEWPORTS)[ViewportKey]][]).map(
            ([key, cfg]) => (
              <Button
                key={key}
                variant="ghost"
                size="icon"
                onClick={() => setViewport(key)}
                title={cfg.label}
                aria-pressed={viewport === key}
                className={cn(
                  "h-7 w-7 text-muted-foreground hover:bg-hud-cyan/10 hover:text-hud-cyan",
                  viewport === key && "bg-hud-cyan/15 text-hud-cyan"
                )}
              >
                <cfg.icon className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>

        <div
          className="mx-auto h-full overflow-hidden rounded-md border border-white/10 bg-white transition-[width] duration-300 ease-out"
          style={{ width: VIEWPORTS[viewport].width }}
        >
          <iframe
            title="Vista previa del componente generado"
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="h-full w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
