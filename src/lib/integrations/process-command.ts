import "server-only";
import { generateText } from "ai";
import { getAnthropicProvider } from "@/lib/ai/client";
import { getModelId } from "@/lib/ai/router";
import { JARVIS_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildMockChatReply } from "@/lib/ai/mock-responses";

// El mismo cerebro (JARVIS_SYSTEM_PROMPT) que responde en la web procesa los
// comandos remotos, con una coletilla que aclara los límites reales de este
// canal: por WhatsApp/Telegram no hay editor de código ni marcas [[TAREA]]
// que mostrar, y hay acciones (publicar en redes, tocar una web ya en
// producción) que V.E.R.A todavía no ejecuta de forma automática — mejor
// que lo diga con claridad a que finja haberlo hecho.
const REMOTE_CHANNEL_SUFFIX = `

Estás respondiendo por WhatsApp/Telegram, no desde la web: responde en frases cortas y naturales, sin bloques de código ni marcas [[TAREA: ...]]. Si te piden algo que hoy no puedes ejecutar de forma automática desde aquí (publicar en redes sociales, modificar una web ya publicada, cobros...), dilo con claridad y sugiere confirmarlo desde el Builder de V.E.R.A en vez de fingir que ya está hecho.`;

/**
 * Procesa un comando recibido por un canal remoto y devuelve la respuesta
 * en texto plano lista para reenviar al chat del usuario.
 */
export async function processRemoteCommand(command: string): Promise<string> {
  const anthropic = getAnthropicProvider();

  if (!anthropic) {
    return buildMockChatReply(command, "voice");
  }

  const { text } = await generateText({
    model: anthropic(getModelId("fast")),
    system: JARVIS_SYSTEM_PROMPT + REMOTE_CHANNEL_SUFFIX,
    prompt: command,
  });

  return text.trim();
}
