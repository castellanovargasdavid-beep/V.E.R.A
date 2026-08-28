"use client";

import { useCallback, useRef, useState } from "react";

interface UseVeraAudioReturn {
  isSpeaking: boolean;
  amplitude: number;
  /** Intenta reproducir con el motor neuronal (ElevenLabs u OpenAI TTS, vía
   *  /api/voice/synthesize). Devuelve false si ninguno está disponible (sin
   *  clave configurada o error), para que el caller recurra a la Opción C:
   *  la Web Speech API nativa del navegador. */
  speak: (text: string) => Promise<boolean>;
  stop: () => void;
}

/**
 * Reproduce la voz neuronal de V.E.R.A. (Opción A/B del motor modular en
 * `lib/tts.ts`) y analiza su audio en tiempo real con Web Audio API para
 * que el núcleo 3D reaccione a la amplitud y frecuencias reales de la voz
 * mientras habla, no a una animación simulada.
 */
export function useVeraAudio(): UseVeraAudioReturn {
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

      return fetch("/api/voice/synthesize", {
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
