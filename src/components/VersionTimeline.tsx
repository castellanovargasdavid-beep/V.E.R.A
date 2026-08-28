"use client";

import { useVersionHistory } from "@/lib/state/version-history";
import { cn } from "@/lib/utils";

/**
 * Selector horizontal compacto de versiones ("Mark I", "Mark II"...). Al
 * pulsar una versión anterior, restaura el código en memoria al instante —
 * sin llamar a la API — y avisa al padre vía `onRestore` para que actualice
 * el estado del componente que se está editando.
 */
export function VersionTimeline({ onRestore }: { onRestore: (code: string) => void }) {
  const { versions, currentId, restoreVersion } = useVersionHistory();

  if (versions.length === 0) return null;

  function handleClick(id: string) {
    const version = restoreVersion(id);
    if (version) onRestore(version.code);
  }

  return (
    <div className="hud-scroll flex items-center gap-1.5 overflow-x-auto px-0.5 py-1">
      {versions.map((v) => {
        const isCurrent = v.id === currentId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => handleClick(v.id)}
            title={`${v.prompt}\n${new Date(v.createdAt).toLocaleString("es")}`}
            aria-pressed={isCurrent}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[0.65rem] font-semibold transition-colors",
              isCurrent
                ? "border-hud-cyan bg-hud-cyan/15 text-hud-cyan shadow-[0_0_10px_-2px_rgba(0,240,255,0.6)]"
                : "border-border text-muted-foreground hover:border-hud-cyan/40 hover:text-foreground"
            )}
          >
            [{v.label}
            {isCurrent ? " · Actual" : ""}]
          </button>
        );
      })}
    </div>
  );
}
