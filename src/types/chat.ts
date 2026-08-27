export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  modelUsed?: ModelTier;
  generatedCode?: string;
}

export type ModelTier = "fast" | "reasoning";

export interface ModelRouteDecision {
  tier: ModelTier;
  modelId: string;
  reason: string;
}

export interface ChatSession {
  id: string;
  projectId: string | null;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}
