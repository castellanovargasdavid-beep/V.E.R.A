import { createAnthropic } from "@ai-sdk/anthropic";
import { isAnthropicConfigured } from "@/lib/mock/data";

let cachedAnthropic: ReturnType<typeof createAnthropic> | null = null;

/**
 * Devuelve el proveedor Anthropic configurado con la API key del entorno,
 * o `null` si no hay clave disponible (modo mock).
 */
export function getAnthropicProvider() {
  if (!isAnthropicConfigured()) return null;

  if (!cachedAnthropic) {
    cachedAnthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return cachedAnthropic;
}

/**
 * Simula un stream de texto token a token para modo demo (sin API key),
 * respetando la misma interfaz de lectura que consumirá el cliente.
 */
export function mockTextStream(fullText: string, delayMs = 18): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = fullText.split(/(\s+)/);

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      controller.close();
    },
  });
}
