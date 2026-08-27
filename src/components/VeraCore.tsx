"use client";

import { cn } from "@/lib/utils";

export type VeraCoreState = "idle" | "listening" | "thinking";

interface VeraCoreProps {
  state: VeraCoreState;
  /** Nivel real del micrófono (0-1). Solo se usa en estado "listening". */
  amplitude?: number;
  className?: string;
}

// Perfil de alturas de las barras centrales, la del medio más alta,
// para que en reposo/escucha ya se lea como una forma de onda.
const BAR_SHAPE = [0.5, 0.78, 1, 0.78, 0.5];

/**
 * Reactor holográfico de V.E.R.A. — anillos concéntricos girando en
 * direcciones opuestas, partículas orbitando y un núcleo con ondas
 * centrales que reaccionan al estado del asistente. Animado enteramente
 * con transform/opacity vía CSS (acelerado por hardware, sin JS en el
 * loop de animación) salvo el pulso de "listening", que sí depende de la
 * amplitud real del micrófono pasada por props.
 */
export function VeraCore({ state, amplitude = 0, className }: VeraCoreProps) {
  const level = Math.min(Math.max(amplitude, 0), 1);
  const coreScale = state === "listening" ? 1 + level * 0.3 : undefined;
  const glowAlpha = state === "listening" ? 0.35 + level * 0.4 : state === "thinking" ? 0.55 : 0.3;

  return (
    <div className={cn("relative aspect-square", className)} aria-hidden="true">
      {/* Halo ambiental */}
      <div
        className={cn(
          "absolute inset-[4%] rounded-full blur-2xl transition-opacity duration-700",
          state === "thinking" ? "opacity-90" : state === "listening" ? "opacity-80" : "opacity-45"
        )}
        style={{
          background:
            "radial-gradient(circle, rgba(0,240,255,0.5) 0%, rgba(0,112,243,0.25) 45%, transparent 72%)",
        }}
      />

      {/* Anillo exterior */}
      <div className="absolute inset-[2%] rounded-full border border-hud-cyan/25 [animation:spin_22s_linear_infinite] [box-shadow:0_0_40px_rgba(0,240,255,0.12)] [will-change:transform]" />
      <div className="absolute inset-0 rounded-full border border-dashed border-hud-cyan/20 [animation:spin_32s_linear_infinite_reverse] [will-change:transform]" />

      {/* Anillo medio, dirección opuesta */}
      <div
        className={cn(
          "absolute inset-[14%] rounded-full border-2 [animation:spin_14s_linear_infinite_reverse] [box-shadow:0_0_30px_rgba(0,112,243,0.22)] [will-change:transform]",
          state === "thinking" ? "border-hud-cyan/70" : "border-hud-blue/35"
        )}
      />

      {/* Anillo de escaneo rápido — solo visible mientras "piensa" */}
      <div
        className={cn(
          "absolute inset-[21%] rounded-full border-t-2 border-hud-cyan transition-opacity duration-500 [will-change:transform]",
          state === "thinking" ? "opacity-90 [animation:spin_1s_linear_infinite]" : "opacity-0"
        )}
      />

      {/* Partículas orbitando a distintos radios y velocidades */}
      <div className="absolute inset-[10%] [animation:spin_9s_linear_infinite] [will-change:transform]">
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-hud-cyan [box-shadow:0_0_8px_2px_rgba(0,240,255,0.6)]" />
      </div>
      <div className="absolute inset-[17%] [animation:spin_13s_linear_infinite_reverse] [will-change:transform]">
        <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-hud-blue [box-shadow:0_0_6px_2px_rgba(0,112,243,0.6)]" />
      </div>
      <div className="absolute inset-[3%] [animation:spin_18s_linear_infinite] [will-change:transform]">
        <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-hud-violet/80 [box-shadow:0_0_6px_2px_rgba(139,92,246,0.5)]" />
      </div>

      {/* Núcleo */}
      <div
        className={cn(
          "absolute inset-[29%] rounded-full transition-[box-shadow] duration-300",
          state === "idle" && "animate-orb-breathe",
          state === "thinking" && "animate-orb-think"
        )}
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(190,248,255,0.95), rgba(0,200,255,0.55) 42%, rgba(0,90,200,0.35) 78%)",
          boxShadow: `0 0 3.5em rgba(0,240,255,${glowAlpha})`,
          transform: coreScale ? `scale(${coreScale})` : undefined,
        }}
      >
        {/* Ondas centrales */}
        <div className="absolute inset-0 flex items-center justify-center gap-[6%]">
          {BAR_SHAPE.map((factor, i) => (
            <span
              key={i}
              className={cn(
                "h-[38%] w-[9%] origin-center rounded-full bg-white/90",
                state === "idle" && "animate-orb-breathe",
                state === "thinking" && "animate-eq-bar"
              )}
              style={{
                animationDelay: state === "thinking" ? `${i * 80}ms` : undefined,
                animationDuration: state === "thinking" ? "0.45s" : undefined,
                transform: state === "listening" ? `scaleY(${0.25 + level * factor})` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
