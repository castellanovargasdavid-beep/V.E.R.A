"use client";

import { useState, type KeyboardEvent } from "react";
import { SendHorizonal, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ChatInput({
  onSend,
  isStreaming,
}: {
  onSend: (value: string) => void;
  isStreaming: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-jarvis/20 bg-background/60 p-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe qué quieres construir, V.E.R.A te escucha..."
        className="min-h-[44px] flex-1 resize-none border-jarvis/20 bg-black/20 font-mono text-sm focus-visible:ring-jarvis"
        rows={1}
      />
      <Button
        variant="jarvis"
        size="icon"
        onClick={handleSubmit}
        disabled={isStreaming || !value.trim()}
        aria-label="Enviar mensaje"
      >
        {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
      </Button>
    </div>
  );
}
