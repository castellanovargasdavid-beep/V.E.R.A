export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "unsupported";

export interface VoiceTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}
