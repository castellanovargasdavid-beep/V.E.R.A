"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatTerminal } from "@/components/jarvis/chat-terminal";
import { LivePreview } from "@/components/builder/live-preview";
import { CodePanel } from "@/components/builder/code-panel";
import { MOCK_CHAT_HISTORY, MOCK_STARTER_CODE } from "@/lib/mock/data";

export default function BuilderPage() {
  const [code, setCode] = useState(MOCK_STARTER_CODE);
  const [isGenerating, setIsGenerating] = useState(false);

  function handleCodeGenerated(newCode: string) {
    setIsGenerating(true);
    setCode(newCode);
    setTimeout(() => setIsGenerating(false), 300);
  }

  return (
    <div className="flex h-full flex-col p-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold">Builder en vivo</h1>
        <p className="text-sm text-muted-foreground">
          Habla con V.E.R.A para generar y editar tu interfaz en tiempo real.
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
        <ChatTerminal
          initialMessages={MOCK_CHAT_HISTORY}
          intent="ui_generation"
          onCodeGenerated={handleCodeGenerated}
        />

        <Tabs defaultValue="preview" className="flex h-full flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="preview">Vista previa</TabsTrigger>
            <TabsTrigger value="code">Código</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <LivePreview code={code} isGenerating={isGenerating} />
          </TabsContent>
          <TabsContent value="code" className="flex-1 overflow-hidden">
            <CodePanel code={code} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
