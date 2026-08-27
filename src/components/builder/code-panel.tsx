"use client";

import { Code2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CodePanel({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-black/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Code2 className="h-3.5 w-3.5" />
          <span>Código generado</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 px-2 text-xs">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-emerald-300">
        <code>{code || "// Aún no se ha generado código. Pídeselo a V.E.R.A en el chat."}</code>
      </pre>
    </div>
  );
}
