"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { generateId } from "@/lib/utils";

export interface Version {
  id: string;
  /** "Mark I", "Mark II"... */
  label: string;
  code: string;
  prompt: string;
  createdAt: string;
}

interface VersionHistoryContextValue {
  versions: Version[];
  currentId: string | null;
  addVersion: (code: string, prompt: string) => void;
  restoreVersion: (id: string) => Version | undefined;
}

const VersionHistoryContext = createContext<VersionHistoryContextValue | null>(null);

const ROMAN_NUMERALS = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
];

function markLabel(index: number): string {
  return `Mark ${ROMAN_NUMERALS[index] ?? String(index + 1)}`;
}

/**
 * Historial de versiones ("armaduras") del componente que se está editando
 * en el Builder — cada generación exitosa o patch quirúrgico aplicado se
 * guarda como una instantánea local. Restaurar una versión anterior es
 * puramente local (no llama a la API): el código ya está en memoria.
 */
export function VersionHistoryProvider({ children }: { children: ReactNode }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const addVersion = useCallback((code: string, prompt: string) => {
    setVersions((prev) => {
      // Evita duplicar una versión idéntica al código ya guardado (p.ej. un
      // patch que la IA devuelve sin cambios reales).
      const last = prev[prev.length - 1];
      if (last && last.code === code) return prev;
      const version: Version = {
        id: generateId("mark"),
        label: markLabel(prev.length),
        code,
        prompt,
        createdAt: new Date().toISOString(),
      };
      setCurrentId(version.id);
      return [...prev, version];
    });
  }, []);

  const restoreVersion = useCallback(
    (id: string) => {
      const version = versions.find((v) => v.id === id);
      if (version) setCurrentId(id);
      return version;
    },
    [versions]
  );

  return (
    <VersionHistoryContext.Provider value={{ versions, currentId, addVersion, restoreVersion }}>
      {children}
    </VersionHistoryContext.Provider>
  );
}

export function useVersionHistory(): VersionHistoryContextValue {
  const ctx = useContext(VersionHistoryContext);
  if (!ctx) throw new Error("useVersionHistory debe usarse dentro de VersionHistoryProvider");
  return ctx;
}
