export type IntegrationProvider = "telegram" | "whatsapp";

export interface IntegrationLink {
  id: string;
  provider: IntegrationProvider;
  /** chat_id (Telegram) o wa_id (WhatsApp) — se enmascara en la UI. */
  externalId: string;
  linkedAt: string;
}

export interface IntegrationLinkToken {
  token: string;
  expiresAt: string;
}
