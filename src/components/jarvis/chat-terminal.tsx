"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/jarvis/chat-input";
import { MessageBubble } from "@/components/jarvis/message-bubble";
import { extractCodeBlock } from "@/lib/ai/mock-responses";
import { generateId } from "@/lib/utils";
import type { ChatMessage, ModelTier } from "@/types/chat";

export function ChatTerminal({
  initialMessages = [],
  onCodeGenerated,
  intent = "chat",
  className,
}: {
  initialMessages?: ChatMessage[];
  onCodeGenerated?: (code: string) => void;
  intent?: "chat" | "ui_generation";
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(content: string) {
    const userMessage: ChatMessage = {
      id: generateId("msg"),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const assistantId = generateId("msg");
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          intent,
        }),
      });

      const modelTier = (response.headers.get("x-model-tier") as ModelTier | null) ?? "fast";

      if (!response.body) throw new Error("Sin cuerpo de respuesta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullText, modelUsed: modelTier } : m))
        );
      }

      const code = extractCodeBlock(fullText);
      if (code && onCodeGenerated) onCodeGenerated(code);
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "⚠ Error de conexión con V.E.R.A. Verifica tu red o configuración de IA." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-lg border border-jarvis/20 bg-black/30 backdrop-blur-sm ${className ?? ""}`}>
      <div className="flex items-center gap-2 border-b border-jarvis/20 px-4 py-3">
        <Sparkles className="h-4 w-4 animate-pulse-glow text-jarvis" />
        <span className="font-mono text-sm font-semibold tracking-wide text-jarvis">V.E.R.A</span>
        <span className="text-xs text-muted-foreground">copiloto de diseño en línea</span>
      </div>

      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="space-y-5">
          {messages.length === 0 && (
            <p className="font-mono text-sm text-muted-foreground">
              &gt; Esperando instrucciones<span className="animate-blink">_</span>
            </p>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </ScrollArea>

      <ChatInput onSend={handleSend} isStreaming={isStreaming} />
    </div>
  );
}
