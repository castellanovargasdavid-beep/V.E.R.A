import { verifyTelegramSecret, sendTelegramMessage, resolveTelegramFileUrl } from "@/lib/integrations/telegram";
import { handleIncomingMessage } from "@/lib/integrations/handle-incoming";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    voice?: { file_id: string };
    audio?: { file_id: string };
  };
}

export async function POST(req: Request) {
  if (!verifyTelegramSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = (await req.json()) as TelegramUpdate;
  const message = update.message;

  // Sin chat.id no hay a quién responder — se acepta la petición y se
  // ignora (p.ej. eventos de edición de mensaje, miembros del canal, etc.).
  if (!message?.chat?.id) {
    return new Response("ok");
  }

  const chatId = message.chat.id;
  const voiceFileId = message.voice?.file_id ?? message.audio?.file_id ?? null;
  // El deep-link t.me/<bot>?start=<token> hace que Telegram mande
  // "/start <token>" como primer mensaje — se pela el comando para dejar
  // solo el token, tal y como lo espera extractLinkToken.
  const text = message.text?.startsWith("/start ") ? message.text.slice("/start ".length) : message.text;

  try {
    const audioUrl = voiceFileId ? await resolveTelegramFileUrl(voiceFileId) : null;

    await handleIncomingMessage(
      {
        provider: "telegram",
        externalId: String(chatId),
        text: text ?? null,
        audio: audioUrl ? { url: audioUrl, filename: "voice.ogg" } : null,
      },
      (replyText) => sendTelegramMessage(chatId, replyText)
    );
  } catch {
    // Telegram reintenta agresivamente si no respondemos 200 — mejor
    // avisar al usuario del fallo por chat que dejarle sin respuesta y
    // provocar reintentos duplicados del mismo update.
    await sendTelegramMessage(chatId, "⚠ Tuve un problema procesando tu mensaje. Inténtalo de nuevo en un momento.");
  }

  return new Response("ok");
}
