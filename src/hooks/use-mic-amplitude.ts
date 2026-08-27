"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mide en tiempo real el volumen del micrófono (0-1) mientras `active` es true,
 * usando la Web Audio API. Se usa para que la esfera de voz reaccione
 * visualmente a lo que el usuario está diciendo mientras V.E.R.A escucha.
 */
export function useMicAmplitude(active: boolean): number {
  const [amplitude, setAmplitude] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAmplitude(0);
      return;
    }

    let cancelled = false;
    let frameId: number;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioCtx();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          setAmplitude(Math.min(avg / 100, 1));
          frameId = requestAnimationFrame(tick);
        }
        tick();

        cleanupRef.current = () => {
          cancelAnimationFrame(frameId);
          source.disconnect();
          analyser.disconnect();
          audioContext.close();
          stream.getTracks().forEach((t) => t.stop());
        };
      })
      .catch(() => {
        setAmplitude(0);
      });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      setAmplitude(0);
    };
  }, [active]);

  return amplitude;
}
