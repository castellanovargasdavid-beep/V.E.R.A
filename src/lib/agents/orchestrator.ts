import { generateText } from "ai";
import { getAnthropicProvider } from "@/lib/ai/client";
import { getModelId } from "@/lib/ai/router";
import {
  ARCHITECT_SYSTEM_PROMPT,
  COPYWRITER_SYSTEM_PROMPT,
  buildCopywriterUserPrompt,
  SEO_SYSTEM_PROMPT,
  buildSeoUserPrompt,
} from "@/lib/ai/prompts";
import { buildMockChatReply, extractCodeBlock } from "@/lib/ai/mock-responses";
import { instrumentCode } from "@/lib/builder/instrument-jsx";
import type {
  AgentEvent,
  CopyBrief,
  GuardianReport,
  OrchestrationStreamEvent,
  SeoBrief,
} from "@/types/agents";

type Emit = (event: OrchestrationStreamEvent) => void;

function agentEvent(agent: AgentEvent["agent"], status: AgentEvent["status"], message: string): AgentEvent {
  return { type: "agent", agent, status, message };
}

function stripCodeFence(text: string): string {
  const withoutCode = text.replace(/```(?:tsx|jsx|ts|js)?\n[\s\S]*?```/g, "");
  // El modo simulación reutiliza buildMockChatReply, pensado para el chat
  // de una sola llamada, que puede llevar marcas [[TAREA: ...]] — no
  // tienen sentido en esta prosa (el pipeline de agentes no las genera en
  // modo real), así que se limpian aquí para no hablarlas ni mostrarlas.
  return withoutCode.replace(/\[\[TAREA:[^\]]*\]\]/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

function extractJsonObject<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\n([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1] : text) as T;
}

/**
 * Reintenta una operación asíncrona antes de darla por fallida — para que
 * un error puntual de red o un JSON mal formado no tumbe todo el pipeline
 * a la primera. No bloquea el resto de agentes: quien la llama decide qué
 * hacer si, tras los reintentos, sigue fallando.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function runArchitect(
  userPrompt: string,
  anthropic: ReturnType<typeof getAnthropicProvider>
): Promise<{ prose: string; code: string }> {
  if (!anthropic) {
    const mockReply = buildMockChatReply(userPrompt);
    const code = extractCodeBlock(mockReply);
    if (!code) throw new Error("El modo simulación no generó código.");
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { prose: stripCodeFence(mockReply), code };
  }

  const { text } = await generateText({
    model: anthropic(getModelId("reasoning")),
    system: ARCHITECT_SYSTEM_PROMPT,
    prompt: userPrompt,
  });
  const code = extractCodeBlock(text);
  if (!code) throw new Error("El Architect no devolvió un bloque de código válido.");
  return { prose: stripCodeFence(text), code };
}

async function runCopywriter(
  code: string,
  userPrompt: string,
  anthropic: ReturnType<typeof getAnthropicProvider>
): Promise<CopyBrief> {
  if (!anthropic) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      headline: "Modo simulación: sin ANTHROPIC_API_KEY no hay copy real.",
      subheadline: "Configura la clave para que el Copywriter escriba de verdad.",
      cta: "Empezar ahora",
      toneNotes: "—",
    };
  }
  const { text } = await generateText({
    model: anthropic(getModelId("fast")),
    system: COPYWRITER_SYSTEM_PROMPT,
    prompt: buildCopywriterUserPrompt(code, userPrompt),
  });
  return extractJsonObject<CopyBrief>(text);
}

async function runSeo(
  code: string,
  userPrompt: string,
  anthropic: ReturnType<typeof getAnthropicProvider>
): Promise<SeoBrief> {
  if (!anthropic) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      titleTag: "Modo simulación — configura ANTHROPIC_API_KEY",
      metaDescription: "Sin clave configurada no hay análisis SEO real.",
      ogTitle: "V.E.R.A — modo simulación",
      ogDescription: "Configura ANTHROPIC_API_KEY para un análisis SEO real.",
      keywords: [],
    };
  }
  const { text } = await generateText({
    model: anthropic(getModelId("fast")),
    system: SEO_SYSTEM_PROMPT,
    prompt: buildSeoUserPrompt(code, userPrompt),
  });
  return extractJsonObject<SeoBrief>(text);
}

const FORBIDDEN_PATTERNS: { pattern: RegExp; issue: string }[] = [
  { pattern: /dangerouslySetInnerHTML/, issue: "Usa dangerouslySetInnerHTML (riesgo de XSS)." },
  { pattern: /\beval\s*\(/, issue: "Usa eval()." },
  { pattern: /document\.write/, issue: "Usa document.write." },
  { pattern: /new\s+Function\s*\(/, issue: "Construye funciones dinámicamente con new Function()." },
  { pattern: /<script\b/i, issue: "Incluye una etiqueta <script> embebida." },
];

/**
 * Agente Guardian: validación determinista, sin llamada a IA — más rápida,
 * gratis y más de fiar que pedirle a un modelo que "revise si el código es
 * seguro". Reutiliza el mismo escáner de JSX que ya usa el click-to-edit
 * para detectar etiquetas sin cerrar.
 */
function runGuardian(code: string): GuardianReport {
  const issues: string[] = [];

  const importLines = code.match(/^\s*import\s+.*$/gm) ?? [];
  for (const line of importLines) {
    if (!/from\s+["']react["']\s*;?\s*$/.test(line.trim())) {
      issues.push(`Import no permitido: "${line.trim()}" — solo se permite importar "react".`);
    }
  }

  for (const { pattern, issue } of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) issues.push(issue);
  }

  if (!/export\s+default/.test(code)) {
    issues.push("Falta un 'export default' — no hay componente exportado.");
  }

  const { unclosedCount } = instrumentCode(code);
  if (unclosedCount > 0) {
    issues.push(`${unclosedCount} etiqueta(s) JSX sin cerrar correctamente.`);
  }

  return { passed: issues.length === 0, issues };
}

/**
 * Orquesta los 4 sub-agentes: Architect (secuencial, primero — nada más
 * puede empezar sin su código), Copywriter + SEO (en paralelo de verdad
 * vía Promise.allSettled, ambos solo dependen del Architect) y Guardian
 * (secuencial, al final, valida el resultado). Cada evento se empuja a
 * `emit` en cuanto ocurre, para que el cliente pueda pintar el HUD en
 * vivo en vez de esperar a que todo termine.
 */
export async function runOrchestration(userPrompt: string, emit: Emit): Promise<void> {
  const anthropic = getAnthropicProvider();

  emit(agentEvent("architect", "running", "Diseñando estructura de landing…"));
  let architectResult: { prose: string; code: string };
  try {
    architectResult = await withRetry(() => runArchitect(userPrompt, anthropic));
  } catch (err) {
    emit(agentEvent("architect", "error", "No se pudo generar la estructura base."));
    emit({ type: "fatal", message: err instanceof Error ? err.message : "Fallo del Agente Architect." });
    return;
  }
  emit(agentEvent("architect", "done", "Estructura de landing lista."));

  const { code, prose } = architectResult;

  const [copyOutcome, seoOutcome] = await Promise.allSettled([
    (async () => {
      emit(agentEvent("copywriter", "running", "Redactando propuesta de valor y CTA…"));
      const brief = await withRetry(() => runCopywriter(code, userPrompt, anthropic));
      emit(agentEvent("copywriter", "done", `Titular: "${brief.headline}"`));
      return brief;
    })(),
    (async () => {
      emit(agentEvent("seo", "running", "Optimizando metadatos y palabras clave…"));
      const brief = await withRetry(() => runSeo(code, userPrompt, anthropic));
      emit(agentEvent("seo", "done", `${brief.keywords.length} palabras clave identificadas.`));
      return brief;
    })(),
  ]);

  if (copyOutcome.status === "rejected") {
    emit(agentEvent("copywriter", "error", "No se pudo generar el copy — se continúa sin él."));
  }
  if (seoOutcome.status === "rejected") {
    emit(agentEvent("seo", "error", "No se pudo generar el brief SEO — se continúa sin él."));
  }

  emit(agentEvent("guardian", "running", "Validando build de Tailwind y accesibilidad…"));
  const guardian = runGuardian(code);
  emit(
    agentEvent(
      "guardian",
      guardian.passed ? "done" : "error",
      guardian.passed ? "Código validado — listo para renderizar." : `${guardian.issues.length} incidencia(s) detectadas.`
    )
  );

  emit({
    type: "final",
    prose,
    code,
    copyBrief: copyOutcome.status === "fulfilled" ? copyOutcome.value : null,
    seoBrief: seoOutcome.status === "fulfilled" ? seoOutcome.value : null,
    guardian,
  });
}

