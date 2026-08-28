"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatTerminal } from "@/components/jarvis/chat-terminal";
import { LivePreview } from "@/components/builder/live-preview";
import { CodePanel } from "@/components/builder/code-panel";
import { VersionTimeline } from "@/components/VersionTimeline";
import { TelemetryWidget } from "@/components/TelemetryWidget";
import { VersionHistoryProvider, useVersionHistory } from "@/lib/state/version-history";
import { TelemetryProvider, useTelemetry, estimateTokensFromChars } from "@/lib/state/telemetry";
import { MOCK_CHAT_HISTORY, MOCK_STARTER_CODE } from "@/lib/mock/data";
import type { CodeFragment } from "@/lib/builder/instrument-jsx";

function BuilderPageInner() {
  const [code, setCode] = useState(MOCK_STARTER_CODE);
  const [isGenerating, setIsGenerating] = useState(false);
  const { addVersion } = useVersionHistory();
  const { recordCall } = useTelemetry();

  // Siembra "Mark I" con la versión inicial para que el timeline no empiece
  // vacío.
  useEffect(() => {
    addVersion(MOCK_STARTER_CODE, "Versión inicial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCodeGenerated(newCode: string, prompt: string) {
    setIsGenerating(true);
    setCode(newCode);
    addVersion(newCode, prompt);
    setTimeout(() => setIsGenerating(false), 300);
  }

  function handleGenerationTelemetry(info: {
    tier: "fast" | "reasoning";
    latencyMs: number;
    inputChars: number;
    outputChars: number;
  }) {
    recordCall({
      tier: info.tier,
      latencyMs: info.latencyMs,
      estInputTokens: estimateTokensFromChars(info.inputChars),
      estOutputTokens: estimateTokensFromChars(info.outputChars),
    });
  }

  async function handlePatchRequest(fragment: CodeFragment, instruction: string) {
    const startedAt = performance.now();
    const response = await fetch("/api/patch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: fragment.source, instruction }),
    });
    const data = (await response.json()) as { patched?: string; mocked?: boolean; note?: string; error?: string };
    const latencyMs = performance.now() - startedAt;

    recordCall({
      tier: "fast",
      latencyMs,
      estInputTokens: estimateTokensFromChars(fragment.source.length + instruction.length),
      estOutputTokens: estimateTokensFromChars((data.patched ?? "").length),
    });

    if (!data.patched) throw new Error(data.error ?? "Sin respuesta del patch");

    if (data.mocked) return { applied: false, note: data.note };

    const newCode = code.slice(0, fragment.start) + data.patched.trim() + code.slice(fragment.end);
    setCode(newCode);
    addVersion(newCode, `Editar <${fragment.tag}>: ${instruction}`);
    return { applied: true };
  }

  return (
    <div className="relative flex h-full flex-col p-4">
      <header className="mb-3">
        <h1 className="text-lg font-semibold">Builder en vivo</h1>
        <p className="text-sm text-muted-foreground">
          Habla con V.E.R.A para generar tu interfaz, o haz clic en cualquier elemento de la vista
          previa para editarlo al instante.
        </p>
      </header>

      <div className="mb-3">
        <VersionTimeline onRestore={setCode} />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
        <ChatTerminal
          initialMessages={MOCK_CHAT_HISTORY}
          intent="ui_generation"
          onCodeGenerated={handleCodeGenerated}
          onGenerationTelemetry={handleGenerationTelemetry}
        />

        <Tabs defaultValue="preview" className="flex h-full flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="preview">Vista previa</TabsTrigger>
            <TabsTrigger value="code">Código</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <LivePreview
              code={code}
              isGenerating={isGenerating}
              enableClickToEdit
              onPatchRequest={handlePatchRequest}
            />
          </TabsContent>
          <TabsContent value="code" className="flex-1 overflow-hidden">
            <CodePanel code={code} />
          </TabsContent>
        </Tabs>
      </div>

      <TelemetryWidget />
    </div>
  );
}

export default function BuilderPage() {
  return (
    <VersionHistoryProvider>
      <TelemetryProvider>
        <BuilderPageInner />
      </TelemetryProvider>
    </VersionHistoryProvider>
  );
}
