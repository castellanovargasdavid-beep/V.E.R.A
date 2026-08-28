"use client";

import { memo, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItem {
  id: string;
  label: string;
  description: string;
}

const DEFAULT_ITEMS: TodoItem[] = [
  {
    id: "logo",
    label: "Logo y colores de marca",
    description: "Envía tu logo (PNG/SVG) y la paleta de colores que quieres usar.",
  },
  {
    id: "copy",
    label: "Textos definitivos",
    description: "Título, descripción y textos reales que reemplacen a los de ejemplo.",
  },
  {
    id: "media",
    label: "Fotos y videos propios",
    description: "Material multimedia real del negocio o producto, no de stock.",
  },
  {
    id: "domain",
    label: "Dominio",
    description: "Dinos si ya tienes uno o si quieres ayuda para elegirlo.",
  },
  {
    id: "social",
    label: "Cuentas de redes sociales",
    description: "Usuarios de Instagram, TikTok o LinkedIn para adaptar el copy a cada red.",
  },
  {
    id: "audience",
    label: "Público objetivo",
    description: "A quién va dirigido el proyecto: edad, intereses, zona.",
  },
  {
    id: "references",
    label: "Referencias que te gusten",
    description: "Webs o cuentas que te inspiren, para afinar el estilo.",
  },
  {
    id: "review",
    label: "Revisar la vista previa",
    description: "Aprueba o pide cambios sobre lo que V.E.R.A ya generó.",
  },
];

const STORAGE_KEY = "vera:todo-checklist";

/**
 * Panel HUD derecho: checklist de lo que el usuario debe hacer o entregarle
 * a V.E.R.A para completar el proyecto (assets, textos, decisiones). Marcar
 * un ítem persiste en localStorage — solo una conveniencia por dispositivo,
 * no viaja al servidor.
 *
 * Sin props — envuelto en `memo` para que, igual que el resto de paneles
 * HUD, no reconcilie por los re-renders a ~60fps de VeraHero durante el
 * audio; solo su propio estado interno (marcar/desmarcar) lo actualiza.
 */
export const TodoListPanel = memo(function TodoListPanel() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw)));
    } catch {
      // localStorage inaccesible (modo privado, bloqueado): se queda vacío.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checked)));
    } catch {
      // Igual que arriba: si falla, esta sesión simplemente no persiste.
    }
  }, [checked, hydrated]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const doneCount = DEFAULT_ITEMS.filter((item) => checked.has(item.id)).length;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-sm font-semibold text-amber-400">📝 Por entregar a V.E.R.A</h2>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {doneCount}/{DEFAULT_ITEMS.length}
        </span>
      </div>
      <ul className="space-y-2.5">
        {DEFAULT_ITEMS.map((item) => {
          const isChecked = checked.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
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
                <div>
                  <p
                    className={cn(
                      "text-xs font-semibold transition-colors",
                      isChecked ? "text-muted-foreground line-through" : "text-foreground/90"
                    )}
                  >
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "text-xs leading-relaxed transition-colors",
                      isChecked ? "text-muted-foreground/60" : "text-muted-foreground"
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
