"use client";

import { useMemo } from "react";
import { Monitor, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPreviewHtml } from "@/lib/builder/prepare-preview";

export function LivePreview({
  code,
  isGenerating,
  onRefresh,
}: {
  code: string;
  isGenerating?: boolean;
  onRefresh?: () => void;
}) {
  const srcDoc = useMemo(() => buildPreviewHtml(code), [code]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          <span>Vista previa en vivo</span>
          {isGenerating && <span className="animate-pulse text-jarvis">· generando…</span>}
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7 gap-1 px-2 text-xs">
            <RefreshCcw className="h-3 w-3" />
            Refrescar
          </Button>
        )}
      </div>
      <iframe
        title="Vista previa del componente generado"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="h-full w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
