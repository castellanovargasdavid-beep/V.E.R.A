import { memo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TodoTask {
  id: string;
  text: string;
}

/**
 * Panel HUD derecho: no es una guía estática — es la lista en vivo de lo
 * que V.E.R.A pide en su respuesta más reciente (logo, textos, dominio,
 * decisiones...). Cada tarea nace de una marca [[TAREA: ...]] que el modelo
 * inserta en su propia respuesta (ver JARVIS_SYSTEM_PROMPT) y que VeraHero
 * extrae del streaming; este panel solo la muestra y deja marcarla como
 * hecha.
 *
 * La lista es solo de la respuesta en curso: VeraHero la vacía en cuanto
 * el usuario envía un nuevo prompt, así que `tasks` siempre refleja la
 * última respuesta, no un historial acumulado de toda la conversación.
 * El check es estado local del panel (no persiste entre respuestas).
 */
export const TodoListPanel = memo(function TodoListPanel({ tasks }: { tasks: TodoTask[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const doneCount = tasks.filter((task) => checked.has(task.id)).length;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-sm font-semibold text-amber-400">📝 Tareas pendientes</h2>
        {tasks.length > 0 && (
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            {doneCount}/{tasks.length}
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Aún no hay tareas. A medida que hables con V.E.R.A, aquí irá apareciendo lo que necesite
          de ti para avanzar — tu logo, tus textos, tu dominio…
        </p>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((task) => {
            const isChecked = checked.has(task.id);
            return (
              <li key={task.id} className="animate-in fade-in slide-in-from-right-2 duration-300">
                <button
                  type="button"
                  onClick={() => toggle(task.id)}
                  className="flex w-full items-start gap-2.5 text-left"
                  aria-pressed={isChecked}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isChecked
                        ? "border-amber-400 bg-amber-400/90 text-slate-950"
                        : "border-amber-500/40 text-transparent"
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <p
                    className={cn(
                      "text-xs leading-relaxed transition-colors",
                      isChecked ? "text-muted-foreground line-through" : "text-foreground/90"
                    )}
                  >
                    {task.text}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
