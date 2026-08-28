import "server-only";
import { extractLinkToken, consumeLinkToken, getLinkedUserId } from "@/lib/integrations/links";
import { transcribeAudioFromUrl } from "@/lib/integrations/transcribe";
import { processRemoteCommand } from "@/lib/integrations/process-command";
import type { IntegrationProvider } from "@/types/integrations";

export interface IncomingMessage {
  provider: IntegrationProvider;
  /** chat_id (Telegram) o wa_id (WhatsApp). */
  externalId: string;
  text: string | null;
  audio: { url: string; filename: string; fetchInit?: RequestInit } | null;
}

/**
 * Lógica compartida entre los webhooks de Telegram y WhatsApp: vincular
 * cuenta si el mensaje es un código, comprobar que el chat ya está
 * vinculado, transcribir si hace falta, y procesar el comando con
 * V.E.R.A. Cada proveedor solo se encarga de parsear su payload y de
 * enviar la respuesta de vuelta.
 */
export async function handleIncomingMessage(msg: IncomingMessage, reply: (text: string) => Promise<void>): Promise<void> {
  const linkToken = extractLinkToken(msg.text);
  if (linkToken) {
    const linked = await consumeLinkToken(linkToken, msg.provider, msg.externalId);
    await reply(
      linked
        ? "✅ Cuenta vinculada. Ya puedes escribirme o mandarme una nota de voz con lo que necesites — tu web, tus redes, lo que sea."
        : "Ese código no es válido o ya caducó. Genera uno nuevo desde tu panel de V.E.R.A → Configuración → Integraciones Móviles."
    );
    return;
  }

  const userId = await getLinkedUserId(msg.provider, msg.externalId);
  if (!userId) {
    await reply(
      "Todavía no vinculé este chat con tu cuenta de V.E.R.A. Entra a tu panel → Configuración → Integraciones Móviles, genera un código y mándamelo aquí."
    );
    return;
  }

  let commandText = msg.text?.trim() || "";
  if (!commandText && msg.audio) {
    const transcribed = await transcribeAudioFromUrl(msg.audio.url, msg.audio.filename, msg.audio.fetchInit);
    if (!transcribed) {
      await reply(
        "No pude transcribir la nota de voz (¿está configurada la transcripción?). Escríbeme el mensaje en texto mientras tanto."
      );
      return;
    }
    commandText = transcribed;
  }

  if (!commandText) {
    await reply("No entendí el mensaje — mándame texto o una nota de voz con lo que necesites.");
    return;
  }

  const responseText = await processRemoteCommand(commandText);
  await reply(responseText);
}
