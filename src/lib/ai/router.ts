import type { ModelRouteDecision, ModelTier } from "@/types/chat";

/**
 * Model Router — enrutamiento por capas para minimizar coste de inferencia.
 *
 * - "fast": tareas simples de clasificación, respuestas cortas de chat,
 *   generación de copy social. Modelo por defecto: Claude Haiku 4.5
 *   (alternativa intercambiable: Gemini 1.5 Flash).
 * - "reasoning": generación de código/UI compleja, refactors multi-archivo,
 *   razonamiento largo. Modelo: Claude Sonnet 5.
 */

const MODEL_IDS: Record<ModelTier, string> = {
  fast: "claude-haiku-4-5",
  reasoning: "claude-sonnet-5",
};

const CODE_GENERATION_KEYWORDS = [
  "genera",
  "generar",
  "crea",
  "crear",
  "construye",
  "construir",
  "diseña",
  "diseñar",
  "componente",
  "landing",
  "página",
  "pagina",
  "sección",
  "seccion",
  "layout",
  "formulario",
  "rediseña",
  "rediseñar",
  "refactoriza",
  "código",
  "codigo",
];

const COMPLEXITY_LENGTH_THRESHOLD = 220;

/**
 * Decide qué nivel de modelo usar en función del contenido y la intención
 * del mensaje del usuario. Heurística ligera y barata (sin llamada a IA)
 * para no incurrir en coste de enrutamiento.
 */
export function routeMessage(input: {
  content: string;
  intent?: "chat" | "ui_generation" | "social_copy" | "classification";
}): ModelRouteDecision {
  const text = input.content.toLowerCase();

  if (input.intent === "ui_generation") {
    return {
      tier: "reasoning",
      modelId: MODEL_IDS.reasoning,
      reason: "Generación de UI/código: requiere razonamiento estructurado.",
    };
  }

  if (input.intent === "classification" || input.intent === "social_copy") {
    return {
      tier: "fast",
      modelId: MODEL_IDS.fast,
      reason: "Tarea acotada (clasificación o copy corto): modelo económico.",
    };
  }

  const looksLikeGeneration = CODE_GENERATION_KEYWORDS.some((kw) => text.includes(kw));
  const isLong = input.content.length > COMPLEXITY_LENGTH_THRESHOLD;

  if (looksLikeGeneration || isLong) {
    return {
      tier: "reasoning",
      modelId: MODEL_IDS.reasoning,
      reason: looksLikeGeneration
        ? "Detectada intención de generación de UI/código."
        : "Mensaje largo/complejo: se prioriza calidad de razonamiento.",
    };
  }

  return {
    tier: "fast",
    modelId: MODEL_IDS.fast,
    reason: "Mensaje conversacional corto: se prioriza latencia y coste.",
  };
}

export function getModelId(tier: ModelTier): string {
  return MODEL_IDS[tier];
}

/**
 * Heurística ligera (sin IA) para saber si un mensaje pide construir una
 * interfaz — la usa tanto el servidor (routeMessage) como el cliente, para
 * decidir si el Hero debe invocar el pipeline multi-agente en vez del chat
 * conversacional de una sola llamada.
 */
export function looksLikeUiGenerationRequest(content: string): boolean {
  const text = content.toLowerCase();
  return CODE_GENERATION_KEYWORDS.some((kw) => text.includes(kw));
}
