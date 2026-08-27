import { Bot, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

function renderContent(content: string) {
  const parts = content.split(/```(?:tsx|jsx|ts|js)?\n([\s\S]*?)```/g);

  return parts.map((part, i) => {
    const isCode = i % 2 === 1;
    if (isCode) {
      return (
        <pre
          key={i}
          className="mt-2 max-h-64 overflow-auto rounded-md border border-jarvis/20 bg-black/40 p-3 font-mono text-xs text-jarvis-glow"
        >
          <code>{part}</code>
        </pre>
      );
    }
    return part ? (
      <p key={i} className="whitespace-pre-wrap leading-relaxed">
        {part}
      </p>
    ) : null;
  });
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className={cn(isUser ? "bg-secondary" : "bg-jarvis/15 text-jarvis")}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </Avatar>
      <div className={cn("max-w-[80%] space-y-1", isUser && "items-end text-right")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isUser ? "Tú" : "V.E.R.A"}</span>
          {message.modelUsed && (
            <Badge variant={message.modelUsed === "reasoning" ? "jarvis" : "outline"}>
              {message.modelUsed === "reasoning" ? "Sonnet · razonamiento" : "Haiku · rápido"}
            </Badge>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-jarvis/20 bg-jarvis/5 text-foreground"
          )}
        >
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
}
