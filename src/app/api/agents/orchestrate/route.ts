import { runOrchestration } from "@/lib/agents/orchestrator";
import type { OrchestrationStreamEvent } from "@/types/agents";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Pipeline multi-agente en streaming: cada línea de la respuesta es un
 * evento NDJSON (`OrchestrationStreamEvent`) emitido en cuanto ocurre —
 * el cliente los va leyendo a medida que llegan para pintar el HUD de
 * agentes en tiempo real, sin esperar a que termine todo el pipeline.
 */
export async function POST(req: Request) {
  const { prompt } = (await req.json()) as { prompt?: string };

  if (!prompt || !prompt.trim()) {
    return Response.json({ error: "'prompt' es obligatorio." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: OrchestrationStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await runOrchestration(prompt, emit);
      } catch (err) {
        emit({
          type: "fatal",
          message: err instanceof Error ? err.message : "Fallo inesperado del pipeline de agentes.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
