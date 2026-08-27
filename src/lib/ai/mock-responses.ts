import { MOCK_STARTER_CODE } from "@/lib/mock/data";

const GENERATION_TRIGGERS = [
  "genera",
  "crea",
  "construye",
  "diseña",
  "landing",
  "componente",
  "página",
  "pagina",
];

/**
 * Genera una respuesta simulada coherente cuando no hay ANTHROPIC_API_KEY
 * configurada, para que el chat y el builder funcionen en modo demo.
 * En modo voz evita tecnicismos y bloques de código, ya que el texto se lee
 * en voz alta tal cual.
 */
export function buildMockChatReply(userMessage: string, mode?: "voice"): string {
  if (mode === "voice") {
    return "Ahora mismo estoy en modo de prueba, así que todavía no puedo pensar una respuesta de verdad para ti. En cuanto conecten mi cerebro de inteligencia artificial, podremos charlar con normalidad. Mientras tanto, cuéntame qué te gustaría lograr y lo tendré en cuenta.";
  }

  const lower = userMessage.toLowerCase();
  const isGenerationRequest = GENERATION_TRIGGERS.some((kw) => lower.includes(kw));

  if (isGenerationRequest) {
    return [
      "Modo simulación activo (no se detectó ANTHROPIC_API_KEY). Genero una interfaz de referencia para que puedas seguir iterando el flujo:",
      "",
      "```tsx",
      MOCK_STARTER_CODE.trim(),
      "```",
    ].join("\n");
  }

  return `Modo simulación activo. Recibí tu mensaje: "${userMessage.slice(0, 140)}". Configura ANTHROPIC_API_KEY para conectar con Claude y obtener respuestas reales de V.E.R.A.`;
}

export function extractCodeBlock(text: string): string | null {
  const match = text.match(/```(?:tsx|jsx|ts|js)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}
