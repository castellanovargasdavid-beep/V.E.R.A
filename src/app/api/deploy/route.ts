export const runtime = "nodejs";

interface DeployRequestBody {
  code: string;
}

/**
 * "Despliegue" sin infraestructura externa: el proyecto se codifica en la
 * propia URL y se sirve desde esta misma instancia de V.E.R.A en
 * /p/[code] — un enlace público real y funcional, sin depender de una
 * cuenta de Vercel/Netlify ni de una base de datos. No es un subdominio
 * efímero propio, pero es honesto y funciona de verdad con coste cero.
 */
export async function POST(req: Request) {
  const { code } = (await req.json()) as DeployRequestBody;

  if (!code || !code.trim()) {
    return Response.json({ error: "'code' es obligatorio." }, { status: 400 });
  }

  const encoded = Buffer.from(code, "utf-8").toString("base64url");
  return Response.json({ path: `/p/${encoded}`, deployedAt: new Date().toISOString() });
}
