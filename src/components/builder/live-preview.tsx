"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Monitor,
  RefreshCcw,
  Copy,
  Check,
  Download,
  Loader2,
  Smartphone,
  Tablet,
  X,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPreviewHtml } from "@/lib/builder/prepare-preview";
import { buildProjectZip, downloadBlob } from "@/lib/builder/export-zip";
import { instrumentCode, type CodeFragment } from "@/lib/builder/instrument-jsx";
import { cn } from "@/lib/utils";

const VIEWPORTS = {
  mobile: { label: "Móvil", icon: Smartphone, width: "375px" },
  tablet: { label: "Tablet", icon: Tablet, width: "768px" },
  desktop: { label: "Escritorio", icon: Monitor, width: "100%" },
} as const;

type ViewportKey = keyof typeof VIEWPORTS;

interface Selection {
  id: number;
  tag: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
}

const POPOVER_WIDTH = 288;

export function LivePreview({
  code,
  isGenerating,
  onRefresh,
  enableClickToEdit,
  onPatchRequest,
}: {
  code: string;
  isGenerating?: boolean;
  onRefresh?: () => void;
  /** Activa el click-to-edit: cada etiqueta nativa del preview es seleccionable. */
  enableClickToEdit?: boolean;
  /**
   * Se llama con el fragmento seleccionado y la instrucción del usuario.
   * Devuelve `applied: false` (con una `note`) cuando no hubo cambio real
   * (p.ej. modo simulación sin API key) para no cerrar el popover en
   * silencio como si el cambio se hubiese aplicado.
   */
  onPatchRequest?: (
    fragment: CodeFragment,
    instruction: string
  ) => Promise<{ applied: boolean; note?: string } | void> | { applied: boolean; note?: string } | void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fragmentsRef = useRef<Map<number, CodeFragment>>(new Map());

  const srcDoc = useMemo(() => {
    if (!enableClickToEdit) return buildPreviewHtml(code);
    const { taggedCode, fragments } = instrumentCode(code);
    fragmentsRef.current = fragments;
    return buildPreviewHtml(taggedCode, { enableClickToEdit: true });
  }, [code, enableClickToEdit]);

  const [viewport, setViewport] = useState<ViewportKey>("desktop");
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isPatching, setIsPatching] = useState(false);
  const [patchNote, setPatchNote] = useState<string | null>(null);
  const hasCode = Boolean(code.trim());

  // El código cambió (nueva generación, patch aplicado o Mark restaurada):
  // cualquier selección previa apunta a un fragmento que ya no es válido.
  useEffect(() => {
    setSelection(null);
    setPatchNote(null);
  }, [code]);

  useEffect(() => {
    if (!enableClickToEdit) return;
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "vera:select") return;
      setSelection({ id: event.data.id, tag: event.data.tag, text: event.data.text, rect: event.data.rect });
      setPatchNote(null);
      setInstruction("");
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [enableClickToEdit]);

  function closeSelection() {
    setSelection(null);
    iframeRef.current?.contentWindow?.postMessage({ type: "vera:deselect" }, "*");
  }

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

  async function handlePatchSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selection || !instruction.trim() || isPatching || !onPatchRequest) return;
    const fragment = fragmentsRef.current.get(selection.id);
    if (!fragment) {
      setPatchNote("No se pudo localizar este elemento en el código. Prueba a volver a generar.");
      return;
    }
    setIsPatching(true);
    setPatchNote(null);
    try {
      const result = await onPatchRequest(fragment, instruction.trim());
      if (result && !result.applied) {
        setPatchNote(result.note ?? "No se aplicó ningún cambio.");
      } else {
        closeSelection();
      }
    } catch {
      setPatchNote("No se pudo aplicar el cambio. Inténtalo de nuevo.");
    } finally {
      setIsPatching(false);
    }
  }

  const popoverStyle = useMemo(() => {
    if (!selection) return null;
    const iframeRect = iframeRef.current?.getBoundingClientRect();
    const baseX = (iframeRect?.left ?? 0) + selection.rect.x;
    const baseY = (iframeRect?.top ?? 0) + selection.rect.y + selection.rect.height;
    const left = Math.min(Math.max(8, baseX), window.innerWidth - POPOVER_WIDTH - 8);
    const top = Math.min(baseY + 8, window.innerHeight - 180);
    return { left, top, width: POPOVER_WIDTH };
  }, [selection]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          <span>Vista previa en vivo</span>
          {isGenerating && <span className="animate-pulse text-jarvis">· generando…</span>}
          {enableClickToEdit && (
            <span className="hidden text-hud-cyan/70 sm:inline">· clic en un elemento para editarlo</span>
          )}
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
            cambiar el ancho simulado del viewport — flota sobre la propia
            vista previa sin ocupar espacio fijo en el layout. */}
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
            ref={iframeRef}
            title="Vista previa del componente generado"
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="h-full w-full border-0 bg-white"
          />
        </div>
      </div>

      {/* Mini-input flotante de click-to-edit: anclado a la posición real
          del elemento seleccionado dentro del iframe (su rect + el rect del
          propio iframe en la página, ya que el contenido del iframe está
          aislado y solo llega por postMessage). */}
      {selection && popoverStyle && (
        <div
          className="fixed z-30 rounded-xl border border-hud-cyan/30 bg-slate-950/95 p-3 shadow-[0_0_30px_-6px_rgba(0,240,255,0.5)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{ left: popoverStyle.left, top: popoverStyle.top, width: popoverStyle.width }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-hud-cyan">
              <Wand2 className="h-3 w-3" />
              &lt;{selection.tag}&gt;
            </span>
            <button
              type="button"
              onClick={closeSelection}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <form onSubmit={handlePatchSubmit} className="space-y-2">
            <input
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Pídele a V.E.R.A qué cambiar en este componente..."
              className="w-full rounded-lg border border-hud-cyan/20 bg-white/[0.03] px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-hud-cyan/50 focus:outline-none"
              disabled={isPatching}
            />
            {patchNote && <p className="text-[0.65rem] text-amber-400">{patchNote}</p>}
            <Button
              type="submit"
              variant="jarvis"
              size="sm"
              disabled={!instruction.trim() || isPatching}
              className="h-7 w-full gap-1.5 border-hud-cyan/40 bg-hud-cyan/10 text-xs text-hud-cyan hover:bg-hud-cyan/20"
            >
              {isPatching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              {isPatching ? "Aplicando cambio…" : "Aplicar cambio"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
