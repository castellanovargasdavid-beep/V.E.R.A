import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Handshake GET de verificación que exige Meta al registrar el webhook. */
export function verifyWhatsAppChallenge(searchParams: URLSearchParams): string | null {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return challenge;
  }
  return null;
}

/**
 * Meta firma cada POST con HMAC-SHA256 del cuerpo crudo usando el App
 * Secret, en la cabecera `X-Hub-Signature-256: sha256=<hex>`. Hay que leer
 * el body como texto ANTES de parsearlo a JSON para poder verificar la
 * firma sobre los bytes exactos que Meta firmó.
 */
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;

  const expectedHex = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const receivedHex = signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const receivedBuf = Buffer.from(receivedHex, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

/** Resuelve un media id de WhatsApp a una URL descargable temporal (requiere Bearer al descargarla). */
export async function resolveWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

export function whatsAppMediaAuthHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN ?? ""}` };
}

export function whatsAppDeepLink(token: string): string | null {
  const number = process.env.WHATSAPP_BUSINESS_NUMBER;
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(token)}`;
}
