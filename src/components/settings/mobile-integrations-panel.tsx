"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Send, MessageCircle, Loader2, Copy, Check, Trash2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import type { IntegrationLink } from "@/types/integrations";

interface TokenData {
  token: string;
  expiresAt: string;
  telegramLink: string | null;
  whatsappLink: string | null;
}

function maskExternalId(id: string): string {
  return id.length <= 4 ? "••••" : `••••${id.slice(-4)}`;
}

/** formatRelativeTime está pensada para fechas pasadas ("vinculado hace X");
 * la caducidad del token es futura, así que necesita su propio formato. */
function formatExpiry(iso: string): string {
  const minutesLeft = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (minutesLeft <= 0) return "caducado";
  if (minutesLeft === 1) return "caduca en 1 minuto";
  return `caduca en ${minutesLeft} minutos`;
}

/**
 * Sección "📱 Integraciones Móviles" del panel de configuración: genera un
 * código de vinculación de un solo uso (con QR y deep-link) para conectar
 * un chat de Telegram o WhatsApp a la cuenta, y lista/gestiona los canales
 * ya vinculados. `status` refleja si Supabase está configurado y si hay
 * sesión — sin ambos no hay dónde guardar el vínculo de forma duradera.
 */
export function MobileIntegrationsPanel({
  status,
  initialLinks,
}: {
  status: "unconfigured" | "unauthenticated" | "ready";
  initialLinks: IntegrationLink[];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/link-token", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo generar el código.");
      setTokenData(data as TokenData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el código.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!tokenData) return;
    await navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleUnlink(id: string) {
    setUnlinkingId(id);
    try {
      const response = await fetch("/api/integrations/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) setLinks((prev) => prev.filter((link) => link.id !== id));
    } finally {
      setUnlinkingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-jarvis" />
        <h2 className="text-base font-semibold">📱 Integraciones Móviles</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Vincula WhatsApp o Telegram para hablar con V.E.R.A desde el móvil — mándale texto o notas de voz y te
        responde en el mismo chat.
      </p>

      {status === "unconfigured" && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          Esta función requiere Supabase configurado (el vínculo entre tu cuenta y tu chat necesita guardarse de
          forma duradera). Configura <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> para activarla.
        </p>
      )}

      {status === "unauthenticated" && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          Inicia sesión para vincular un canal móvil a tu cuenta.
        </p>
      )}

      {status === "ready" && (
        <div className="space-y-5">
          <div>
            <Button variant="jarvis" onClick={handleGenerate} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              {isGenerating ? "Generando…" : "Generar código de vinculación"}
            </Button>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>

          {tokenData && (
            <div className="space-y-3 rounded-lg border border-jarvis/20 bg-jarvis/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-lg font-semibold tracking-wide text-jarvis">{tokenData.token}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatExpiry(tokenData.expiresAt)} · un solo uso
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background/60 p-3 text-center">
                  <Send className="h-4 w-4 text-sky-400" />
                  <p className="text-xs font-medium">Telegram</p>
                  {tokenData.telegramLink ? (
                    <>
                      <div className="rounded-md bg-white p-2">
                        <QRCodeSVG value={tokenData.telegramLink} size={100} />
                      </div>
                      <a href={tokenData.telegramLink} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          Abrir Telegram
                        </Button>
                      </a>
                    </>
                  ) : (
                    <p className="text-[0.7rem] text-muted-foreground">No configurado en este servidor.</p>
                  )}
                </div>

                <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background/60 p-3 text-center">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-medium">WhatsApp</p>
                  {tokenData.whatsappLink ? (
                    <>
                      <div className="rounded-md bg-white p-2">
                        <QRCodeSVG value={tokenData.whatsappLink} size={100} />
                      </div>
                      <a href={tokenData.whatsappLink} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          Abrir WhatsApp
                        </Button>
                      </a>
                    </>
                  ) : (
                    <p className="text-[0.7rem] text-muted-foreground">No configurado en este servidor.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Canales vinculados
            </p>
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no has vinculado ningún canal.</p>
            ) : (
              <ul className="space-y-2">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {link.provider === "telegram" ? (
                        <Send className="h-4 w-4 text-sky-400" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-emerald-400" />
                      )}
                      <span className="font-medium capitalize">{link.provider}</span>
                      <span className="font-mono text-xs text-muted-foreground">{maskExternalId(link.externalId)}</span>
                      <span className="text-xs text-muted-foreground">· vinculado {formatRelativeTime(link.linkedAt)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnlink(link.id)}
                      disabled={unlinkingId === link.id}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label="Desvincular"
                    >
                      {unlinkingId === link.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
