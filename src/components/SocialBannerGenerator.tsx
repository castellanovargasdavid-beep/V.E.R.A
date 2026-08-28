"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildGraphicsZip } from "@/lib/social/build-graphics-zip";
import { downloadBlob } from "@/lib/builder/export-zip";
import type { SocialCampaign } from "@/types/prompt";

const FORMATS = [
  { key: "instagram", label: "Post 1:1", sublabel: "Instagram", aspect: "1 / 1", filename: "post-instagram-1x1.png" },
  { key: "story", label: "Story 9:16", sublabel: "TikTok / Reels", aspect: "9 / 16", filename: "story-tiktok-9x16.png" },
  { key: "linkedin", label: "Banner 1.91:1", sublabel: "LinkedIn", aspect: "1.91 / 1", filename: "banner-linkedin.png" },
] as const;

type FormatKey = (typeof FORMATS)[number]["key"];

/**
 * Genera creatividades gráficas (PNG a resolución nativa, vía /api/export-image
 * con next/og) a partir del claim de la campaña y una paleta de dos colores
 * editable. La "extracción" de marca es honesta: se parte del titular ya
 * generado por el Agente Multicanal, no de un análisis automático del
 * diseño web — el usuario puede ajustar claim y colores antes de generar.
 */
export function SocialBannerGenerator({ campaign }: { campaign: SocialCampaign }) {
  const [claim, setClaim] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#00f0ff");
  const [secondaryColor, setSecondaryColor] = useState("#0070f3");
  const [previews, setPreviews] = useState<Record<FormatKey, string> | null>(null);
  const [blobs, setBlobs] = useState<Record<FormatKey, Blob> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const seed = campaign.posts[0]?.headline ?? campaign.sourceSummary;
    setClaim(seed.slice(0, 140));
  }, [campaign]);

  // Libera los object URLs de las vistas previas anteriores al desmontar o regenerar.
  useEffect(() => {
    return () => {
      if (previews) Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  async function handleGenerate() {
    if (!claim.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const entries = await Promise.all(
        FORMATS.map(async ({ key }) => {
          const response = await fetch("/api/export-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claim, primaryColor, secondaryColor, format: key }),
          });
          if (!response.ok) throw new Error(`Fallo generando ${key}`);
          const blob = await response.blob();
          return [key, blob] as const;
        })
      );
      const nextBlobs = Object.fromEntries(entries) as Record<FormatKey, Blob>;
      const nextPreviews = Object.fromEntries(
        entries.map(([key, blob]) => [key, URL.createObjectURL(blob)])
      ) as Record<FormatKey, string>;
      setBlobs(nextBlobs);
      setPreviews(nextPreviews);
    } catch {
      setError("No se pudieron generar las creatividades. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownloadPack() {
    if (!blobs || isZipping) return;
    setIsZipping(true);
    try {
      const zip = await buildGraphicsZip(
        FORMATS.map(({ key, filename }) => ({ filename, blob: blobs[key] }))
      );
      downloadBlob(zip, "pack-grafico-vera.zip");
    } finally {
      setIsZipping(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Claim principal</label>
          <Input value={claim} onChange={(e) => setClaim(e.target.value)} maxLength={140} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Color 1</label>
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Color 2</label>
          <input
            type="color"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-background"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="jarvis" onClick={handleGenerate} disabled={isGenerating || !claim.trim()} className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? "Generando…" : "Generar creatividades"}
        </Button>
        {blobs && (
          <Button variant="outline" onClick={handleDownloadPack} disabled={isZipping} className="gap-2">
            {isZipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar Pack Gráfico
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {FORMATS.map(({ key, label, sublabel, aspect }) => (
          <div key={key} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {label} · <span className="text-foreground/70">{sublabel}</span>
            </p>
            <div
              className="overflow-hidden rounded-lg border border-border bg-muted/20"
              style={{ aspectRatio: aspect }}
            >
              {previews?.[key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[key]} alt={`Creatividad ${label}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[0.65rem] text-muted-foreground">
                  Sin generar
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
