"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

/**
 * Divide el texto en frases para poder hablarlas como utterances separadas.
 * Encadenar una única utterance larga suena monótono (mismo ritmo de
 * principio a fin); hablar frase a frase con una pausa entre medias imita
 * mejor el ritmo natural de una conversación.
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function jitter(base: number, spread: number): number {
  return base + (Math.random() - 0.5) * spread;
}

/**
 * Envuelve la Web Speech API (síntesis de voz) del navegador para que V.E.R.A
 * responda en voz alta sin coste de infraestructura ni claves de API externas.
 * Selecciona automáticamente una voz en español si está disponible.
 */
export function useSpeechSynthesis({ lang = "es-ES" }: { lang?: string } = {}): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const stoppedRef = useRef(false);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      const isHighQuality = (v: SpeechSynthesisVoice) =>
        /natural|neural|online|premium|enhanced|google/i.test(v.name);

      const spanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
      const anySpanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));

      voiceRef.current =
        spanishVoices.find(isHighQuality) ??
        anySpanishVoices.find(isHighQuality) ??
        spanishVoices[0] ??
        anySpanishVoices[0] ??
        null;
    }

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, [lang]);

  const cancel = useCallback(() => {
    stoppedRef.current = true;
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;

      window.speechSynthesis.cancel();
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      stoppedRef.current = false;

      const sentences = splitIntoSentences(text);
      if (sentences.length === 0) return;

      setIsSpeaking(true);
      let index = 0;

      const speakNext = () => {
        if (stoppedRef.current || index >= sentences.length) {
          setIsSpeaking(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(sentences[index]);
        index++;
        utterance.lang = lang;
        // Pequeña variación aleatoria de ritmo/tono entre frases: una única
        // utterance larga suena plana de principio a fin; variar un poco
        // frase a frase imita mejor la prosodia de una voz real.
        utterance.rate = jitter(0.97, 0.08);
        utterance.pitch = jitter(1.0, 0.08);
        if (voiceRef.current) utterance.voice = voiceRef.current;

        utterance.onend = () => {
          if (stoppedRef.current) {
            setIsSpeaking(false);
            return;
          }
          pauseTimeoutRef.current = setTimeout(speakNext, jitter(160, 100));
        };
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    },
    [lang]
  );

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return { isSupported, isSpeaking, speak, cancel };
}
