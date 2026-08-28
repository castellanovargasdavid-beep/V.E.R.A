import "server-only";
import { timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/**
 * Telegram no firma el payload — en su lugar, `setWebhook` se registra con
 * un `secret_token` que Telegram reenvía tal cual en la cabecera
 * `X-Telegram-Bot-Api-Secret-Token` en cada petición. Comparación en
 * tiempo constante para no filtrar el secreto por temporización.
 */
export function verifyTelegramSecret(req: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;

  const received = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(received);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

/** Resuelve un `file_id` de Telegram a una URL descargable temporal. */
export async function resolveTelegramFileUrl(fileId: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const res = await fetch(`${API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; result?: { file_path?: string } };
  if (!data.ok || !data.result?.file_path) return null;

  return `${API_BASE}/file/bot${token}/${data.result.file_path}`;
}

export function telegramDeepLink(token: string): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return null;
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}
