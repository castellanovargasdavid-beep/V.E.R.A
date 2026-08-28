"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Zap, Coins, Timer } from "lucide-react";
import { useTelemetry } from "@/lib/state/telemetry";

/**
 * Widget colapsable de telemetría de coste/rendimiento ("Reactor Arc
 * Metrics"), anclado a la esquina inferior del panel del Builder. Se
 * alimenta de `useTelemetry` — cada llamada real a /api/chat o /api/patch
 * registra su tier de modelo, latencia y tokens estimados vía
 * `recordCall`.
 */
export function TelemetryWidget() {
  const { calls, savedPct, estimatedCostEur, lastLatencyMs } = useTelemetry();
  const [collapsed, setCollapsed] = useState(false);
  const hasData = calls.length > 0;

  return (
    <div className="absolute bottom-4 right-4 z-20 w-56 rounded-lg border border-hud-cyan/25 bg-slate-950/85 font-mono text-[0.65rem] shadow-[0_0_25px_-8px_rgba(0,240,255,0.35)] backdrop-blur-md">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-3 py-2 text-hud-cyan"
      >
        <span className="flex items-center gap-1.5 tracking-wide">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hud-cyan opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-hud-cyan" />
          </span>
          ARC METRICS
        </span>
        {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {!collapsed && (
        <div className="space-y-2 border-t border-hud-cyan/15 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3 w-3 text-emerald-400" />
              Tokens ahorrados
            </span>
            <span className="text-emerald-400">{hasData ? `${savedPct}%` : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Coins className="h-3 w-3 text-amber-400" />
              Coste de sesión
            </span>
            <span className="text-amber-400">{hasData ? `${estimatedCostEur.toFixed(4)} €` : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="h-3 w-3 text-hud-cyan" />
              Latencia última
            </span>
            <span className="text-hud-cyan">{lastLatencyMs === null ? "—" : `${Math.round(lastLatencyMs)} ms`}</span>
          </div>
        </div>
      )}
    </div>
  );
}
