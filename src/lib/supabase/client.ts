"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/mock/data";

/**
 * Cliente Supabase para uso en Client Components.
 * Devuelve `null` si las variables de entorno no están configuradas,
 * en cuyo caso la UI debe recurrir a datos simulados (mock).
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
