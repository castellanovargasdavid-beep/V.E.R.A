import { buildPreviewHtml } from "@/lib/builder/prepare-preview";

export const runtime = "nodejs";

function decodeCode(encoded: string): string | null {
  try {
    return Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}

/** Sirve el HTML estático del proyecto publicado — el "sitio en vivo". */
export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  const { code: encoded } = await context.params;
  const code = decodeCode(encoded);

  if (!code) {
    return new Response("Enlace inválido o corrupto.", { status: 404 });
  }

  return new Response(buildPreviewHtml(code), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
