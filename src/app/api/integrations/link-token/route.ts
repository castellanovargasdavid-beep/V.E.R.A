import { createClient } from "@/lib/supabase/server";
import { createLinkToken } from "@/lib/integrations/links";
import { telegramDeepLink } from "@/lib/integrations/telegram";
import { whatsAppDeepLink } from "@/lib/integrations/whatsapp";

export const runtime = "nodejs";

/** Genera un código de vinculación de un solo uso para el usuario autenticado. */
export async function POST() {
  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Supabase no está configurado en este entorno." }, { status: 501 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Inicia sesión para vincular un canal." }, { status: 401 });
  }

  const result = await createLinkToken(supabase, user.id);
  if (!result) {
    return Response.json({ error: "No se pudo generar el código. Inténtalo de nuevo." }, { status: 500 });
  }

  return Response.json({
    token: result.token,
    expiresAt: result.expiresAt,
    telegramLink: telegramDeepLink(result.token),
    whatsappLink: whatsAppDeepLink(result.token),
  });
}
