import { generateText } from "ai";
import { getAnthropicProvider } from "@/lib/ai/client";
import { getModelId } from "@/lib/ai/router";
import { JSX_PATCH_SYSTEM_PROMPT, buildJsxPatchUserPrompt } from "@/lib/ai/prompts";

export const runtime = "nodejs";

interface PatchRequestBody {
  fragment: string;
  instruction: string;
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:tsx|jsx|ts|js)?\n([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

export async function POST(req: Request) {
  const { fragment, instruction } = (await req.json()) as PatchRequestBody;

  if (!fragment?.trim() || !instruction?.trim()) {
    return Response.json({ error: "'fragment' e 'instruction' son obligatorios." }, { status: 400 });
  }

  const anthropic = getAnthropicProvider();

  // Los patches quirúrgicos siempre usan el modelo rápido: es un cambio
  // acotado a un único elemento, no requiere el razonamiento del modelo
  // pesado — parte del ahorro de tokens que mide el widget de telemetría.
  if (!anthropic) {
    return Response.json({
      patched: fragment,
      mocked: true,
      note: "Modo simulación activo (no se detectó ANTHROPIC_API_KEY): el fragmento no cambia. Configura la clave para aplicar ediciones reales.",
    });
  }

  try {
    const { text } = await generateText({
      model: anthropic(getModelId("fast")),
      system: JSX_PATCH_SYSTEM_PROMPT,
      prompt: buildJsxPatchUserPrompt(fragment, instruction),
    });

    return Response.json({ patched: stripFences(text), mocked: false });
  } catch {
    return Response.json({ error: "No se pudo aplicar el cambio. Inténtalo de nuevo." }, { status: 502 });
  }
}
