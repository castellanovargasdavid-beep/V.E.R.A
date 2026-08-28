import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const FORMATS = {
  instagram: { width: 1080, height: 1080, claimSize: 64 },
  story: { width: 1080, height: 1920, claimSize: 76 },
  linkedin: { width: 1200, height: 628, claimSize: 52 },
} as const;

type FormatKey = keyof typeof FORMATS;

function isFormatKey(value: unknown): value is FormatKey {
  return typeof value === "string" && value in FORMATS;
}

/**
 * Genera una creatividad gráfica (PNG) para redes a partir de un claim y
 * una paleta de dos colores, en el formato pedido. Renderizado server-side
 * con `next/og` (Satori) — sin headless browser, sin librería nueva en el
 * cliente, resolución nativa exacta por formato.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    claim?: string;
    primaryColor?: string;
    secondaryColor?: string;
    format?: string;
  };

  if (!isFormatKey(body.format)) {
    return Response.json({ error: "'format' debe ser instagram, story o linkedin." }, { status: 400 });
  }

  const claim = (body.claim ?? "V.E.R.A").slice(0, 140);
  const primaryColor = body.primaryColor ?? "#00f0ff";
  const secondaryColor = body.secondaryColor ?? "#0070f3";
  const { width, height, claimSize } = FORMATS[body.format];

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 72,
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: claimSize,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#ffffff",
            textShadow: "0 2px 24px rgba(0,0,0,0.25)",
            maxWidth: width - 144,
          }}
        >
          {claim}
        </div>
        <div
          style={{
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 6,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          V.E.R.A
        </div>
      </div>
    ),
    { width, height }
  );
}
