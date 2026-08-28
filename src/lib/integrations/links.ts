import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/supabase/service";
import type { IntegrationLink, IntegrationLinkToken, IntegrationProvider } from "@/types/integrations";

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos (0/O, 1/I/L)
const TOKEN_TTL_MINUTES = 15;

function randomToken(): string {
  const bytes = randomBytes(6);
  let suffix = "";
  for (const byte of bytes) suffix += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
  return `VERA-${suffix}`;
}

/** Detecta si un texto de mensaje ES literalmente un código de vinculación. */
export function extractLinkToken(text: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim().toUpperCase();
  return /^VERA-[A-Z0-9]{6}$/.test(trimmed) ? trimmed : null;
}

/**
 * Crea un token de vinculación para el usuario autenticado — se llama con
 * SU PROPIO cliente de Supabase (sesión normal), así que el insert lo
 * protege la misma RLS que el resto de tablas de usuario.
 */
export async function createLinkToken(
  supabase: SupabaseClient,
  userId: string
): Promise<IntegrationLinkToken | null> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();

  const { error } = await supabase
    .from("integration_link_tokens")
    .insert({ token, user_id: userId, expires_at: expiresAt });

  if (error) return null;
  return { token, expiresAt };
}

export async function listLinkedChannels(
  supabase: SupabaseClient,
  userId: string
): Promise<IntegrationLink[]> {
  const { data, error } = await supabase
    .from("integration_links")
    .select("id, provider, external_id, linked_at")
    .eq("user_id", userId)
    .order("linked_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    provider: row.provider as IntegrationProvider,
    externalId: row.external_id,
    linkedAt: row.linked_at,
  }));
}

export async function unlinkChannel(supabase: SupabaseClient, userId: string, linkId: string): Promise<boolean> {
  const { error } = await supabase.from("integration_links").delete().eq("id", linkId).eq("user_id", userId);
  return !error;
}

// --- Solo para webhooks (sin sesión de usuario — service role) ---

/**
 * Consume un token de vinculación pendiente y crea el vínculo
 * provider+external_id -> user_id. Devuelve `false` si el token no existe,
 * ya se usó o caducó.
 */
export async function consumeLinkToken(
  token: string,
  provider: IntegrationProvider,
  externalId: string
): Promise<boolean> {
  const supabase = getServiceRoleClient();
  if (!supabase) return false;

  const { data: tokenRow } = await supabase
    .from("integration_link_tokens")
    .select("user_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || tokenRow.consumed_at || new Date(tokenRow.expires_at) < new Date()) {
    return false;
  }

  const { error: linkError } = await supabase
    .from("integration_links")
    .upsert(
      { user_id: tokenRow.user_id, provider, external_id: externalId },
      { onConflict: "provider,external_id" }
    );
  if (linkError) return false;

  await supabase.from("integration_link_tokens").update({ consumed_at: new Date().toISOString() }).eq("token", token);
  return true;
}

export async function getLinkedUserId(provider: IntegrationProvider, externalId: string): Promise<string | null> {
  const supabase = getServiceRoleClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("integration_links")
    .select("user_id")
    .eq("provider", provider)
    .eq("external_id", externalId)
    .maybeSingle();

  return data?.user_id ?? null;
}
