"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
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
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      // Rate/pitch ligeramente por debajo de lo natural para sonar más
      // pausado y cálido en vez de la cadencia por defecto, más robótica.
      utterance.rate = 0.96;
      utterance.pitch = 1.0;
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [lang]
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return { isSupported, isSpeaking, speak, cancel };
}
