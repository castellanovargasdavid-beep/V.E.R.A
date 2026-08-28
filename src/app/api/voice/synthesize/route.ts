import { synthesizeSpeech } from "@/lib/tts";

export const runtime = "nodejs";

/**
 * Convierte texto a voz con el motor modular de `lib/tts.ts` (ElevenLabs ->
 * OpenAI TTS -> ninguno; `synthesizeSpeech` ya degrada de un motor a otro
 * internamente si el primero falla). Devuelve 501 cuando ningún motor está
 * configurado o ambos fallan, para que el cliente recurra a la Web Speech
 * API nativa del navegador.
 */
export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };

  if (!text || !text.trim()) {
    return new Response(null, { status: 400 });
  }

  const result = await synthesizeSpeech(text.trim());
  if (!result) {
    return new Response(null, { status: 501 });
  }

  return new Response(result.audio, {
    headers: {
      "Content-Type": result.contentType,
      "X-TTS-Engine": result.engine,
    },
  });
}
