"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, LayoutTemplate, PenTool, TrendingUp, ShieldCheck, Loader2, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentEvent, AgentId, AgentStatus, OrchestrationFinalEvent } from "@/types/agents";

const AGENT_META: Record<AgentId, { label: string; icon: typeof LayoutTemplate }> = {
  architect: { label: "UI Architect", icon: LayoutTemplate },
  copywriter: { label: "Copy Strategist", icon: PenTool },
  seo: { label: "SEO Strategist", icon: TrendingUp },
  guardian: { label: "Code Guardian", icon: ShieldCheck },
};

const AGENT_ORDER: AgentId[] = ["architect", "copywriter", "seo", "guardian"];

function StatusIcon({ status }: { status: AgentStatus | "pending" }) {
  if (status === "running") return <Loader2 className="h-3 w-3 animate-spin text-hud-cyan" />;
  if (status === "done") return <Check className="h-3 w-3 text-emerald-400" />;
  if (status === "error") return <AlertTriangle className="h-3 w-3 text-amber-400" />;
  return <span className="h-3 w-3 rounded-full border border-muted-foreground/30" />;
}

/**
 * Telemetría en vivo del pipeline multi-agente ("Director General" +
 * Architect/Copywriter/SEO/Guardian) — un panel desplegable anclado junto
 * a la esfera neuronal que muestra a cada sub-agente trabajando (en
 * paralelo de verdad para Copywriter/SEO) a medida que van llegando sus
 * eventos por streaming desde /api/agents/orchestrate.
 */
export function AgentActivityHUD({
  events,
  final,
  fatal,
}: {
  events: AgentEvent[];
  final: OrchestrationFinalEvent | null;
  fatal: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<AgentId | null>(null);

  const latestByAgent = useMemo(() => {
    const map = new Map<AgentId, AgentEvent>();
    for (const event of events) map.set(event.agent, event);
    return map;
  }, [events]);

  if (events.length === 0 && !fatal) return null;

  const allSettled = AGENT_ORDER.every((id) => {
    const status = latestByAgent.get(id)?.status;
    return status === "done" || status === "error";
  });

  return (
    <div className="mb-4 w-full max-w-md rounded-xl border border-hud-cyan/20 bg-slate-950/80 font-mono text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-3 py-2 text-hud-cyan"
      >
        <span className="flex items-center gap-1.5 tracking-wide">
          <span className="relative flex h-1.5 w-1.5">
            {!allSettled && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hud-cyan opacity-60" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-hud-cyan" />
          </span>
          AGENT PIPELINE
        </span>
        {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {!collapsed && (
        <div className="space-y-1.5 border-t border-hud-cyan/15 px-3 py-2.5">
          {fatal && <p className="text-[0.7rem] text-destructive">{fatal}</p>}

          {AGENT_ORDER.map((id) => {
            const event = latestByAgent.get(id);
            const status = event?.status ?? "pending";
            const meta = AGENT_META[id];
            const hasDetail =
              final &&
              status === "done" &&
              ((id === "copywriter" && final.copyBrief) ||
                (id === "seo" && final.seoBrief) ||
                (id === "guardian" && final.guardian.issues.length > 0));

            return (
              <div key={id}>
                <button
                  type="button"
                  onClick={() => hasDetail && setExpandedAgent((prev) => (prev === id ? null : id))}
                  disabled={!hasDetail}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors",
                    hasDetail && "hover:bg-white/[0.04]"
                  )}
                >
                  <meta.icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="shrink-0 text-foreground/90">[{meta.label}]</span>
                  <span className="flex-1 truncate text-muted-foreground">
                    {event?.message ?? "En espera…"}
                  </span>
                  <StatusIcon status={status} />
                </button>

                {expandedAgent === id && final && (
                  <div className="ml-6 mt-1 space-y-1 rounded-md border border-hud-cyan/10 bg-white/[0.02] p-2 text-[0.68rem] leading-relaxed text-muted-foreground">
                    {id === "copywriter" && final.copyBrief && (
                      <>
                        <p>
                          <span className="text-foreground/80">Titular:</span> {final.copyBrief.headline}
                        </p>
                        <p>
                          <span className="text-foreground/80">Subtítulo:</span> {final.copyBrief.subheadline}
                        </p>
                        <p>
                          <span className="text-foreground/80">CTA:</span> {final.copyBrief.cta}
                        </p>
                        <p>
                          <span className="text-foreground/80">Tono:</span> {final.copyBrief.toneNotes}
                        </p>
                      </>
                    )}
                    {id === "seo" && final.seoBrief && (
                      <>
                        <p>
                          <span className="text-foreground/80">Title tag:</span> {final.seoBrief.titleTag}
                        </p>
                        <p>
                          <span className="text-foreground/80">Meta description:</span>{" "}
                          {final.seoBrief.metaDescription}
                        </p>
                        <p>
                          <span className="text-foreground/80">Keywords:</span>{" "}
                          {final.seoBrief.keywords.join(", ") || "—"}
                        </p>
                      </>
                    )}
                    {id === "guardian" && final.guardian.issues.length > 0 && (
                      <ul className="list-inside list-disc space-y-0.5">
                        {final.guardian.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
