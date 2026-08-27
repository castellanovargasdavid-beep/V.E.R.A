"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send } from "lucide-react";
import { VoiceOrb } from "@/components/voice/voice-orb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { useMicAmplitude } from "@/hooks/use-mic-amplitude";
import { generateId } from "@/lib/utils";
import type { VoiceState, VoiceTurn } from "@/types/voice";

const PHASE_LABEL: Record<VoiceState, string> = {
  idle: "Toca la esfera y habla con V.E.R.A",
  listening: "Escuchando…",
  thinking: "Procesando…",
  speaking: "Respondiendo…",
  unsupported: "Modo texto (voz no disponible en este navegador)",
};

export function VoiceAssistant() {
  const [phase, setPhase] = useState<VoiceState>("idle");
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const turnsRef = useRef<VoiceTurn[]>([]);
  turnsRef.current = turns;

  const { speak, cancel: cancelSpeech, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();

  const { isSupported: sttSupported, isListening, interimTranscript, error: sttError, start, stop } =
    useSpeechRecognition({
      onFinalResult: (transcript) => handleUserMessage(transcript),
    });

  const micAmplitude = useMicAmplitude(isListening);

  useEffect(() => {
    setPhase((prev) => {
      if (isListening) return "listening";
      return prev === "listening" ? "idle" : prev;
    });
  }, [isListening]);

  useEffect(() => {
    if (!isSpeaking) {
      setPhase((prev) => (prev === "speaking" ? "idle" : prev));
    }
  }, [isSpeaking]);

  async function handleUserMessage(text: string) {
    if (!text.trim()) return;

    const userTurn: VoiceTurn = {
      id: generateId("turn"),
      role: "user",
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, userTurn]);
    setPhase("thinking");

    try {
      const history = [...turnsRef.current, userTurn].map((turn) => ({
        role: turn.role,
        content: turn.text,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, intent: "chat" }),
      });

      if (!response.body) throw new Error("Sin cuerpo de respuesta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const assistantTurn: VoiceTurn = {
        id: generateId("turn"),
        role: "assistant",
        text: fullText || "No he recibido respuesta. Intenta de nuevo.",
        createdAt: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, assistantTurn]);

      if (ttsSupported && !isMuted) {
        setPhase("speaking");
        speak(assistantTurn.text);
      } else {
        setPhase("idle");
      }
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          id: generateId("turn"),
          role: "assistant",
          text: "⚠ Error de conexión con V.E.R.A. Verifica tu red o configuración de IA.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setPhase("idle");
    }
  }

  function handleMicClick() {
    if (phase === "listening") {
      stop();
      return;
    }
    if (phase === "speaking") cancelSpeech();
    start();
  }

  function handleToggleMute() {
    if (!isMuted) cancelSpeech();
    setIsMuted((m) => !m);
  }

  function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
    const value = textInput.trim();
    if (!value || phase === "thinking") return;
    setTextInput("");
    handleUserMessage(value);
  }

  const orbState: VoiceState = !sttSupported && !ttsSupported ? "unsupported" : phase;
  const lastTurn = turns[turns.length - 1];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="relative flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={!sttSupported || phase === "thinking"}
          className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-jarvis disabled:cursor-not-allowed"
          aria-label={phase === "listening" ? "Detener escucha" : "Empezar a hablar"}
        >
          <VoiceOrb state={orbState} amplitude={micAmplitude} size={260} />
          {sttSupported && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              {phase === "listening" ? (
                <MicOff className="h-7 w-7 text-white drop-shadow" />
              ) : (
                <Mic className="h-7 w-7 text-white drop-shadow" />
              )}
            </span>
          )}
        </button>

        <p className="font-mono text-sm text-muted-foreground">
          {sttSupported ? PHASE_LABEL[phase] : PHASE_LABEL.unsupported}
          {interimTranscript && <span className="text-jarvis"> “{interimTranscript}”</span>}
        </p>

        {sttError && <p className="text-xs text-destructive">Error de micrófono: {sttError}</p>}
      </div>

      {lastTurn && (
        <div className="max-w-lg space-y-1 rounded-lg border border-jarvis/20 bg-jarvis/5 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {lastTurn.role === "user" ? "Tú dijiste" : "V.E.R.A responde"}
          </p>
          <p className="text-foreground">{lastTurn.text}</p>
        </div>
      )}

      <div className="flex w-full max-w-md items-center gap-2">
        <form onSubmit={handleTextSubmit} className="flex flex-1 items-center gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="…o escribe aquí si prefieres no hablar"
            className="border-jarvis/20 bg-black/20"
          />
          <Button type="submit" variant="jarvis" size="icon" disabled={!textInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {ttsSupported && (
          <Button variant="ghost" size="icon" onClick={handleToggleMute} aria-label="Silenciar voz">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
