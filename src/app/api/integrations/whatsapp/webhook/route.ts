import {
  verifyWhatsAppChallenge,
  verifyWhatsAppSignature,
  sendWhatsAppMessage,
  resolveWhatsAppMediaUrl,
  whatsAppMediaAuthHeaders,
} from "@/lib/integrations/whatsapp";
import { handleIncomingMessage } from "@/lib/integrations/handle-incoming";

export const runtime = "nodejs";
export const maxDuration = 60;

interface WhatsAppWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          from: string;
          type: string;
          text?: { body: string };
          audio?: { id: string };
        }[];
      };
    }[];
  }[];
}

/** Handshake de verificación que Meta exige al registrar la URL del webhook. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = verifyWhatsAppChallenge(searchParams);
  if (challenge === null) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(challenge);
}

export async function POST(req: Request) {
  // El body se lee como texto CRUDO antes de parsear a JSON — la firma de
  // Meta se calcula sobre los bytes exactos, no sobre un objeto re-serializado.
  const rawBody = await req.text();
  if (!verifyWhatsAppSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  // Notificaciones sin mensaje (p.ej. confirmaciones de entrega) — se
  // reconoce con 200 y no hay nada que procesar.
  if (!message?.from) {
    return new Response("ok");
  }

  const from = message.from;

  try {
    let audio: { url: string; filename: string; fetchInit?: RequestInit } | null = null;
    if (message.type === "audio" && message.audio?.id) {
      const mediaUrl = await resolveWhatsAppMediaUrl(message.audio.id);
      if (mediaUrl) audio = { url: mediaUrl, filename: "voice.ogg", fetchInit: { headers: whatsAppMediaAuthHeaders() } };
    }

    await handleIncomingMessage(
      {
        provider: "whatsapp",
        externalId: from,
        text: message.text?.body ?? null,
        audio,
      },
      (replyText) => sendWhatsAppMessage(from, replyText)
    );
  } catch {
    await sendWhatsAppMessage(from, "⚠ Tuve un problema procesando tu mensaje. Inténtalo de nuevo en un momento.");
  }

  return new Response("ok");
}
