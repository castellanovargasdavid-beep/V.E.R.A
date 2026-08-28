export type AgentId = "architect" | "copywriter" | "seo" | "guardian";
export type AgentStatus = "running" | "done" | "error";

export interface AgentEvent {
  type: "agent";
  agent: AgentId;
  status: AgentStatus;
  message: string;
}

export interface CopyBrief {
  headline: string;
  subheadline: string;
  cta: string;
  toneNotes: string;
}

export interface SeoBrief {
  titleTag: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string[];
}

export interface GuardianReport {
  passed: boolean;
  issues: string[];
}

export interface OrchestrationFinalEvent {
  type: "final";
  prose: string;
  code: string;
  copyBrief: CopyBrief | null;
  seoBrief: SeoBrief | null;
  guardian: GuardianReport;
}

export interface OrchestrationFatalEvent {
  type: "fatal";
  message: string;
}

export type OrchestrationStreamEvent = AgentEvent | OrchestrationFinalEvent | OrchestrationFatalEvent;
