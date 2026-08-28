"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Gauge, Target, Share2, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WebAuditReport } from "@/types/audit";

const AUDIT_BRIEF_KEY = "vera:audit-brief";

/**
 * "Diagnóstico táctico": el usuario mete una URL y V.E.R.A hace un fetch
 * real de esa página, mide señales técnicas reales (peso, viewport,
 * imágenes sin dimensiones, CTAs, enlaces sociales) y las convierte en un
 * informe estructurado. No es un informe de laboratorio de Core Web
 * Vitals (eso requiere Chrome headless) — es una estimación honesta a
 * partir de heurísticas sobre el HTML servido.
 */
export function WebAuditScanner() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<WebAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || isScanning) return;
    setIsScanning(true);
    setError(null);
    setReport(null);
    try {
      const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Fallo el escaneo");
      setReport(data as WebAuditReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el escaneo.");
    } finally {
      setIsScanning(false);
    }
  }

  function handleRebuild() {
    if (!report) return;
    const brief = [
      `Acabo de escanear mi web (${url}) y este fue el diagnóstico de V.E.R.A:`,
      report.summary,
      `Rendimiento: ${report.performanceLabel}.`,
      `Puntos débiles de conversión: ${report.croWeakPoints.join(" ")}`,
      `Brecha en redes sociales: ${report.socialGaps.join(" ")}`,
      "Reconstrúyela y optimízala ahora.",
    ].join(" ");
    sessionStorage.setItem(AUDIT_BRIEF_KEY, brief);
    router.push("/builder");
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24">
      <div className="rounded-2xl border border-hud-cyan/20 bg-slate-900/40 p-6 backdrop-blur-md">
        <h2 className="mb-1 flex items-center gap-2 font-mono text-sm font-semibold text-hud-cyan">
          <ScanLine className="h-4 w-4" />
          🔍 Escanear URL Existente
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Dinos tu dominio actual y V.E.R.A hace un diagnóstico táctico: rendimiento, conversión y huecos en
          redes.
        </p>

        <form onSubmit={handleScan} className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="tudominio.com"
            className="font-mono text-sm"
            disabled={isScanning}
          />
          <Button type="submit" variant="jarvis" disabled={isScanning || !url.trim()} className="gap-2">
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            {isScanning ? "Escaneando…" : "Escanear"}
          </Button>
        </form>

        {isScanning && (
          <div className="relative mt-5 h-24 overflow-hidden rounded-lg border border-hud-cyan/20 bg-black/40 font-mono text-[0.65rem] text-hud-cyan/70">
            <div className="absolute inset-x-0 h-px bg-hud-cyan shadow-[0_0_12px_2px_rgba(0,240,255,0.7)] animate-scan-sweep" />
            <div className="p-3 leading-relaxed">
              &gt; conectando con el objetivo…
              <br />
              &gt; midiendo tiempo de respuesta y peso de página…
              <br />
              &gt; analizando CTAs y presencia social…
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {report && (
          <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-hud-cyan/20 bg-white/[0.02] p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-hud-cyan">
                  <Gauge className="h-3.5 w-3.5" />
                  Rendimiento
                </p>
                <p className="mb-1.5 text-xs font-medium text-foreground/90">{report.performanceLabel}</p>
                <ul className="space-y-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                  {report.performanceNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-white/[0.02] p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-amber-400">
                  <Target className="h-3.5 w-3.5" />
                  Conversión (CRO)
                </p>
                <ul className="space-y-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                  {report.croWeakPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-fuchsia-500/20 bg-white/[0.02] p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-fuchsia-400">
                  <Share2 className="h-3.5 w-3.5" />
                  Brecha en redes
                </p>
                <ul className="space-y-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                  {report.socialGaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            </div>

            <Button
              variant="jarvis"
              onClick={handleRebuild}
              className="w-full gap-2 border-hud-cyan/40 bg-hud-cyan/10 text-hud-cyan hover:bg-hud-cyan/20"
            >
              <Zap className="h-4 w-4" />
              V.E.R.A, reconstruye y optimiza esta web ahora
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
