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

export interface SocialPost {
  platform: SocialPlatform;
  headline: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
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
