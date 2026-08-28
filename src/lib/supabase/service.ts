import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/mock/data";

let cached: SupabaseClient | null = null;

export function isServiceRoleConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Cliente Supabase con la service role key — bypassa RLS. Úsalo SOLO desde
 * webhooks server-to-server (Telegram/WhatsApp) que no llevan sesión de
 * usuario y por tanto no tienen `auth.uid()` para que las políticas RLS
 * normales funcionen. Nunca lo importes desde código que pueda acabar en
 * el bundle del navegador — el paquete `server-only` lo hace fallar en
 * build si alguien lo intenta.
 */
export function getServiceRoleClient(): SupabaseClient | null {
  if (!isServiceRoleConfigured()) return null;

  if (!cached) {
    cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }

  return cached;
}
