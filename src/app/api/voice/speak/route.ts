import { isElevenLabsConfigured } from "@/lib/mock/data";
import { synthesizeSpeech } from "@/lib/voice/elevenlabs";

export const runtime = "nodejs";

/**
 * Convierte texto a voz natural con ElevenLabs cuando está configurado.
 * Devuelve 501 si no hay clave, o 502 si la síntesis falla, para que el
 * cliente sepa que debe recurrir a la voz nativa del navegador.
 */
export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };

  if (!text || !text.trim()) {
    return new Response(null, { status: 400 });
  }

  if (!isElevenLabsConfigured()) {
    return new Response(null, { status: 501 });
  }

  try {
    const audio = await synthesizeSpeech(text.trim());
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
