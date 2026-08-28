export type GenerationKind = "ui_component" | "social_copy" | "chat_reply";

export interface Generation {
  id: string;
  projectId: string | null;
  userId: string;
  kind: GenerationKind;
  prompt: string;
  result: string;
  modelId: string;
  createdAt: string;
}

export type SocialPlatform = "instagram" | "tiktok" | "linkedin";

/** Guión paso a paso para vídeo corto (TikTok/Reels): gancho, retención y CTA. */
export interface SocialScript {
  hook: string;
  retention: string;
  cta: string;
}

export interface SocialPost {
  platform: SocialPlatform;
  headline: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  /** Solo presente en TikTok/Reels — el resto de plataformas no llevan guión de vídeo. */
  script?: SocialScript;
}

export interface SocialCampaign {
  sourceSummary: string;
  posts: SocialPost[];
  generatedAt: string;
}

export interface SocialCopyRequest {
  projectId?: string;
  content: string;
  tone?: "professional" | "casual" | "bold" | "friendly";
}
