"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ModelTier } from "@/types/chat";

export interface TelemetryCall {
  tier: ModelTier;
  latencyMs: number;
  estInputTokens: number;
  estOutputTokens: number;
  at: string;
}

// Precios oficiales de la API de Anthropic, USD por millón de tokens.
const PRICING_USD_PER_MTOK: Record<ModelTier, { input: number; output: number }> = {
  fast: { input: 1.0, output: 5.0 }, // Claude Haiku 4.5
  reasoning: { input: 2.0, output: 10.0 }, // Claude Sonnet 5
};

// Conversión aproximada solo para mostrar una cifra orientativa en euros —
// no es una tasa de cambio en vivo, el coste real siempre se factura en USD.
const USD_TO_EUR = 0.92;

const MAX_CALLS = 200;

interface TelemetryContextValue {
  calls: TelemetryCall[];
  recordCall: (call: Omit<TelemetryCall, "at">) => void;
  /** % de llamadas resueltas con el modelo rápido (Haiku) frente al total. */
  savedPct: number;
  estimatedCostEur: number;
  lastLatencyMs: number | null;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

/** Estimación de tokens a partir de caracteres (heurística ~4 chars/token). */
export function estimateTokensFromChars(chars: number): number {
  return Math.max(1, Math.round(chars / 4));
}

/**
 * Telemetría de coste/rendimiento de la sesión de edición actual — no
 * persiste entre recargas, es puramente informativa para el widget "Reactor
 * Arc Metrics" del Builder.
 */
export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [calls, setCalls] = useState<TelemetryCall[]>([]);

  const recordCall = useCallback((call: Omit<TelemetryCall, "at">) => {
    setCalls((prev) => [...prev, { ...call, at: new Date().toISOString() }].slice(-MAX_CALLS));
  }, []);

  const value = useMemo<TelemetryContextValue>(() => {
    const total = calls.length;
    const fastCalls = calls.filter((c) => c.tier === "fast").length;
    const savedPct = total === 0 ? 0 : Math.round((fastCalls / total) * 100);
    const costUsd = calls.reduce((sum, c) => {
      const rate = PRICING_USD_PER_MTOK[c.tier];
      return sum + (c.estInputTokens / 1_000_000) * rate.input + (c.estOutputTokens / 1_000_000) * rate.output;
    }, 0);
    const lastLatencyMs = total > 0 ? calls[total - 1].latencyMs : null;
    return { calls, recordCall, savedPct, estimatedCostEur: costUsd * USD_TO_EUR, lastLatencyMs };
  }, [calls, recordCall]);

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetry debe usarse dentro de TelemetryProvider");
  return ctx;
}
