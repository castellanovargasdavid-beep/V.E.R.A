"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

/**
 * Limpia el texto antes de enviarlo a la síntesis de voz del navegador.
 * Muchas voces (sobre todo las de menor calidad, que son las que se usan
 * de respaldo aquí) no interpretan los signos de puntuación como pausas:
 * literalmente dicen "coma" o "punto", y anuncian el nombre del emoji. Se
 * sustituyen por saltos de línea (que la mayoría de motores sí tratan como
 * una pausa silenciosa) en vez de dejar que se lean en voz alta.
 */
function sanitizeForSpeech(text: string): string {
  return text
    // "V.E.R.A" se pronuncia como la palabra "Vera", no deletreada letra a
    // letra con una pausa de "punto" entre cada una.
    .replace(/\bV\.\s*E\.\s*R\.\s*A\.?\b/gi, "Vera")
    .replace(
      /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,
      ""
    )
    .replace(/[*_~`#>]/g, "")
    .replace(/[,.;:]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Envuelve la Web Speech API (síntesis de voz) del navegador para que V.E.R.A
 * responda en voz alta sin coste de infraestructura ni claves de API externas.
 * Selecciona automáticamente una voz en español si está disponible.
 *
 * Habla la respuesta como una única utterance (no frase a frase): encadenar
 * utterances separadas con pausas propias sonaba peor, no mejor — cada
 * arranque de utterance añade su propio silencio de motor, y se sumaba a la
 * pausa que ya imponíamos nosotros. Dejar que el motor gestione su propia
 * prosodia sobre texto continuo es lo que suena más natural en la práctica.
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

    // Opción C del motor de voz (100% gratis, sin claves): cuando no hay
    // ElevenLabs ni OpenAI TTS configurados, se elige la voz del sistema más
    // formal disponible — nombres concretos conocidos por sonar serios y
    // masculinos (el registro de mayordomo que pide el perfil de V.E.R.A.)
    // antes que una heurística genérica de "alta calidad".
    const PREFERRED_VOICE_NAMES = [
      /microsoft\s+george/i, // Windows es-GB/en-GB, grave y formal
      /microsoft\s+pablo/i, // Windows es-ES neural masculino
      /microsoft\s+jorge/i, // Windows es-MX neural masculino
      /google\s+uk\s+english\s+male/i,
      /google\s+español/i,
    ];

    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      const isPreferredName = (v: SpeechSynthesisVoice) => PREFERRED_VOICE_NAMES.some((re) => re.test(v.name));
      const isMasculine = (v: SpeechSynthesisVoice) =>
        /\b(male|hombre|masculin[oa])\b/i.test(v.name) && !/\b(female|mujer|femenin[oa])\b/i.test(v.name);
      const isHighQuality = (v: SpeechSynthesisVoice) =>
        /natural|neural|online|premium|enhanced|google/i.test(v.name);

      const spanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
      const anySpanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
      const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));

      voiceRef.current =
        spanishVoices.find(isPreferredName) ??
        anySpanishVoices.find(isPreferredName) ??
        spanishVoices.find(isMasculine) ??
        anySpanishVoices.find(isMasculine) ??
        spanishVoices.find(isHighQuality) ??
        anySpanishVoices.find(isHighQuality) ??
        englishVoices.find(isPreferredName) ??
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

      const cleanText = sanitizeForSpeech(text);
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      // Cadencia pausada y registro algo más grave — el mismo perfil
      // "mayordomo calmado" que los parámetros de ElevenLabs/OpenAI en
      // lib/tts.ts, adaptado a lo que admite la Web Speech API.
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
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
