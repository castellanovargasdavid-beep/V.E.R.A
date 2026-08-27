"use client";

import { useCallback, useRef, useState } from "react";

interface UsePremiumVoiceReturn {
  isSpeaking: boolean;
  amplitude: number;
  /** Intenta reproducir con voz neuronal. Devuelve false si no está
   *  disponible (sin clave configurada o error), para que el caller
   *  recurra a la voz del navegador. */
  speak: (text: string) => Promise<boolean>;
  stop: () => void;
}

/**
 * Reproduce voz neuronal (ElevenLabs, vía /api/voice/speak) y analiza su
 * audio en tiempo real con Web Audio API para que la esfera reaccione a la
 * amplitud real de la voz, no a una animación simulada.
 */
export function usePremiumVoice(): UsePremiumVoiceReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setIsSpeaking(false);
    setAmplitude(0);
  }, []);

  const speak = useCallback(
    (text: string): Promise<boolean> => {
      stop();

      return fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((response) => {
          if (!response.ok) return false;
          return response.blob().then((blob) => playBlob(blob));
        })
        .catch(() => false);

      function playBlob(blob: Blob): Promise<boolean> {
        return new Promise((resolve) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);

          const AudioCtx =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioContext = new AudioCtx();
          const source = audioContext.createMediaElementSource(audio);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.55;
          source.connect(analyser);
          source.connect(audioContext.destination);

          const data = new Uint8Array(analyser.frequencyBinCount);
          let frameId: number;

          function tick() {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
            setAmplitude(Math.min(avg / 100, 1));
            frameId = requestAnimationFrame(tick);
          }

          function finish(success: boolean) {
            cancelAnimationFrame(frameId);
            setIsSpeaking(false);
            setAmplitude(0);
            URL.revokeObjectURL(url);
            audioContext.close().catch(() => {});
            resolve(success);
          }

          audio.onplay = () => {
            setIsSpeaking(true);
            tick();
          };
          audio.onended = () => finish(true);
          audio.onerror = () => finish(false);

          cleanupRef.current = () => {
            audio.pause();
            finish(false);
          };

          audio.play().catch(() => finish(false));
        });
      }
    },
    [stop]
  );

  return { isSpeaking, amplitude, speak, stop };
}
