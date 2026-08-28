import { memo } from "react";
import { cn } from "@/lib/utils";

export type BriefItemKind = "objective" | "proposal" | "deliverable";

export interface BriefItem {
  id: string;
  kind: BriefItemKind;
  label: string;
  text: string;
}

const KIND_STYLES: Record<BriefItemKind, string> = {
  objective: "border-hud-cyan/40 text-hud-cyan",
  proposal: "border-hud-blue/40 text-hud-blue",
  deliverable: "border-emerald-400/40 text-emerald-300",
};

/**
 * Panel HUD izquierdo: un resumen en vivo de la conversación (objetivos que
 * plantea el usuario, propuestas de V.E.R.A y entregables generados) para
 * que no se pierda el hilo del proyecto. Se deriva de los mismos turnos del
 * chat — no requiere una llamada extra al modelo para "extraer" nada.
 *
 * Envuelto en `memo`: el padre (VeraHero) se re-renderiza a ~60fps
 * mientras hay audio activo (el nivel del micrófono/voz llega como estado
 * de React), pero `items` solo cambia cuando de verdad hay un turno nuevo
 * — así este panel no vuelve a reconciliar su lista en cada tick de audio.
 */
export const ProjectBriefPanel = memo(function ProjectBriefPanel({ items }: { items: BriefItem[] }) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-900/40 p-4 backdrop-blur-md">
      <h2 className="mb-3 font-mono text-sm font-semibold text-hud-cyan">
        📋 Project Brief &amp; Action Items
      </h2>
      {items.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Aún no hay nada que registrar. En cuanto hables con V.E.R.A, aquí irán apareciendo los
          objetivos, propuestas y entregables de tu proyecto.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "animate-in fade-in slide-in-from-left-2 border-l-2 pl-3 duration-300",
                KIND_STYLES[item.kind]
              )}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-80">
                {item.label}
              </p>
              <p className="line-clamp-3 text-xs leading-relaxed text-foreground/90">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
