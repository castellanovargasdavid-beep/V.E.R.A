import { createClient } from "@/lib/supabase/server";
import { unlinkChannel } from "@/lib/integrations/links";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id?: string };
  if (!id) {
    return Response.json({ error: "'id' es obligatorio." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Supabase no está configurado en este entorno." }, { status: 501 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const ok = await unlinkChannel(supabase, user.id, id);
  if (!ok) {
    return Response.json({ error: "No se pudo desvincular el canal." }, { status: 500 });
  }

  return Response.json({ success: true });
}
