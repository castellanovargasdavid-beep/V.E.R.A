import { generateText } from "ai";
import { getAnthropicProvider } from "@/lib/ai/client";
import { getModelId } from "@/lib/ai/router";
import { WEB_AUDIT_SYSTEM_PROMPT, buildWebAuditUserPrompt } from "@/lib/ai/prompts";
import type { WebAuditReport } from "@/types/audit";

export const runtime = "nodejs";

interface Heuristics {
  latencyMs: number;
  pageSizeKB: number;
  hasViewportMeta: boolean;
  imgCount: number;
  imgMissingDims: number;
  ctaCount: number;
  hasInstagram: boolean;
  hasTiktok: boolean;
  hasLinkedin: boolean;
}

const CTA_KEYWORDS =
  /(comprar|empieza|empezar|reservar|contactar|contáctanos|suscr[ií]bete|solicitar|reg[ií]strate|agenda|prueba gratis|get started|buy now|sign up|contact us|shop now)/i;

function analyzeHtml(html: string, latencyMs: number): Heuristics {
  const pageSizeKB = Math.round(new TextEncoder().encode(html).length / 1024);
  const hasViewportMeta = /<meta[^>]+name=["']viewport["']/i.test(html);
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imgMissingDims = imgTags.filter((tag) => !/\bwidth=/i.test(tag) || !/\bheight=/i.test(tag)).length;
  const clickableTags = html.match(/<(button|a)\b[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  const ctaCount = clickableTags.filter((tag) => CTA_KEYWORDS.test(tag)).length;

  return {
    latencyMs,
    pageSizeKB,
    hasViewportMeta,
    imgCount: imgTags.length,
    imgMissingDims,
    ctaCount,
    hasInstagram: /instagram\.com/i.test(html),
    hasTiktok: /tiktok\.com/i.test(html),
    hasLinkedin: /linkedin\.com/i.test(html),
  };
}

function extractJson(text: string): WebAuditReport {
  const fenced = text.match(/```(?:json)?\n([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1] : text) as WebAuditReport;
}

function buildMockReport(heuristics: Heuristics): WebAuditReport {
  const performanceNotes = [
    `La página pesa aproximadamente ${heuristics.pageSizeKB} KB de HTML y respondió en ${heuristics.latencyMs} ms.`,
    heuristics.hasViewportMeta
      ? "Declara meta viewport, así que al menos intenta adaptarse a móvil."
      : "No declara meta viewport — en móvil probablemente se ve mal escalada.",
    heuristics.imgMissingDims > 0
      ? `${heuristics.imgMissingDims} de ${heuristics.imgCount} imágenes no declaran ancho/alto, lo que suele causar saltos de layout.`
      : "Las imágenes detectadas declaran sus dimensiones.",
  ];

  const croWeakPoints = [
    heuristics.ctaCount === 0
      ? "No se detectó ningún botón o enlace con texto de llamada a la acción clara."
      : `Solo se detectaron ${heuristics.ctaCount} elementos con texto de CTA — pocos para guiar la conversión.`,
    "Sin un análisis del flujo completo no se puede confirmar si el formulario de contacto es corto y visible.",
  ];

  const socialGaps: string[] = [];
  if (!heuristics.hasInstagram) socialGaps.push("No hay enlace a Instagram en la página.");
  if (!heuristics.hasTiktok) socialGaps.push("No hay enlace a TikTok en la página.");
  if (!heuristics.hasLinkedin) socialGaps.push("No hay enlace a LinkedIn en la página.");
  if (socialGaps.length === 0) socialGaps.push("Las redes principales están enlazadas — el hueco está en la frecuencia de contenido, no en la presencia.");

  return {
    performanceLabel:
      heuristics.pageSizeKB > 500 || !heuristics.hasViewportMeta ? "Con margen de mejora" : "Aceptable",
    performanceNotes,
    croWeakPoints,
    socialGaps,
    summary:
      "Modo simulación activo (no se detectó ANTHROPIC_API_KEY): este diagnóstico se basa solo en las señales técnicas medidas, sin la narrativa completa de V.E.R.A. Configura la clave para un análisis más fino.",
  };
}

export async function POST(req: Request) {
  const { url } = (await req.json()) as { url?: string };

  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Introduce una URL válida (con http:// o https://)." }, { status: 400 });
  }

  let html: string;
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VERAAudit/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = (await res.text()).slice(0, 400_000);
  } catch {
    return Response.json(
      { error: "No se pudo acceder a esa URL. Verifica que sea correcta y esté disponible públicamente." },
      { status: 502 }
    );
  }

  const heuristics = analyzeHtml(html, Date.now() - start);
  const anthropic = getAnthropicProvider();

  if (!anthropic) {
    return Response.json(buildMockReport(heuristics));
  }

  try {
    const { text } = await generateText({
      model: anthropic(getModelId("fast")),
      system: WEB_AUDIT_SYSTEM_PROMPT,
      prompt: buildWebAuditUserPrompt(url, heuristics),
    });
    return Response.json(extractJson(text));
  } catch {
    return Response.json(buildMockReport(heuristics));
  }
}
