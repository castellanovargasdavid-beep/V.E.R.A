"use client";

import { useEffect, useRef } from "react";
import type { VoiceState } from "@/types/voice";

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const STATE_HSL: Record<VoiceState, Hsl> = {
  idle: { h: 189, s: 55, l: 50 },
  listening: { h: 189, s: 94, l: 60 },
  thinking: { h: 38, s: 92, l: 58 },
  speaking: { h: 195, s: 94, l: 64 },
  unsupported: { h: 220, s: 8, l: 45 },
};

function hsla(c: Hsl, lOffset = 0, alpha = 1) {
  return `hsla(${c.h}, ${c.s}%, ${Math.min(Math.max(c.l + lOffset, 0), 95)}%, ${alpha})`;
}

const PARTICLE_COUNT = 10;

export function VoiceOrb({
  state,
  amplitude = 0,
  realAmplitudeSpeaking = false,
  size = 280,
  className,
}: {
  state: VoiceState;
  amplitude?: number;
  /** Cuando el estado es "speaking", indica si `amplitude` proviene de audio
   *  real (voz neuronal) en lugar del pulso sintético por defecto. */
  realAmplitudeSpeaking?: boolean;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const amplitudeRef = useRef(amplitude);
  const realAmplitudeSpeakingRef = useRef(realAmplitudeSpeaking);
  stateRef.current = state;
  amplitudeRef.current = amplitude;
  realAmplitudeSpeakingRef.current = realAmplitudeSpeaking;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = size * 0.2;

    let frameId: number;
    let smoothedAmp = 0;
    let t = 0;

    function targetAmplitude(s: VoiceState) {
      switch (s) {
        case "listening":
          return 0.15 + Math.min(amplitudeRef.current, 1) * 0.6;
        case "speaking":
          if (realAmplitudeSpeakingRef.current) {
            return 0.14 + Math.min(amplitudeRef.current, 1) * 0.65;
          }
          return 0.32 + 0.3 * Math.abs(Math.sin(t * 6.4)) + 0.12 * Math.abs(Math.sin(t * 13.3 + 1.4));
        case "thinking":
          return 0.24 + 0.08 * Math.sin(t * 3);
        case "idle":
          return 0.08 + 0.05 * Math.sin(t * 1.1);
        default:
          return 0.04;
      }
    }

    function draw() {
      t += 0.016;
      const s = stateRef.current;
      const colors = STATE_HSL[s];
      const target = targetAmplitude(s);
      smoothedAmp += (target - smoothedAmp) * 0.16;

      ctx.clearRect(0, 0, size, size);

      const coreRadius = baseRadius * (1 + smoothedAmp * 0.6);

      const glowRadius = coreRadius * (2.2 + smoothedAmp * 1.6);
      const glow = ctx.createRadialGradient(cx, cy, coreRadius * 0.2, cx, cy, glowRadius);
      glow.addColorStop(0, hsla(colors, 10, 0.35 + smoothedAmp * 0.25));
      glow.addColorStop(1, hsla(colors, 0, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      const ringSpeed = s === "thinking" ? 2.4 : 0.6;
      for (let ring = 0; ring < 2; ring++) {
        const radius = coreRadius * (1.55 + ring * 0.35);
        const rotation = t * ringSpeed * (ring % 2 === 0 ? 1 : -1) + ring * 1.4;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.strokeStyle = hsla(colors, 15, 0.25 - ring * 0.08 + smoothedAmp * 0.15);
        ctx.lineWidth = 1.4;
        ctx.setLineDash([radius * 0.35, radius * 0.5]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + t * 0.5;
        const orbitRadius = coreRadius * (1.9 + 0.15 * Math.sin(t * 2 + i));
        const px = cx + Math.cos(angle) * orbitRadius;
        const py = cy + Math.sin(angle) * orbitRadius * 0.94;
        const dotSize = 1 + Math.sin(t * 3 + i) * 0.6;
        ctx.fillStyle = hsla(colors, 20, 0.5 + smoothedAmp * 0.3);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(dotSize, 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      const core = ctx.createRadialGradient(
        cx - coreRadius * 0.3,
        cy - coreRadius * 0.3,
        coreRadius * 0.05,
        cx,
        cy,
        coreRadius
      );
      core.addColorStop(0, hsla(colors, 30, 1));
      core.addColorStop(0.6, hsla(colors, 5, 0.95));
      core.addColorStop(1, hsla(colors, -15, 0.85));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      frameId = requestAnimationFrame(draw);
    }

    draw();

    return () => cancelAnimationFrame(frameId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
      aria-hidden="true"
    />
  );
}
