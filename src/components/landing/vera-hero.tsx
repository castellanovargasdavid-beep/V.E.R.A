"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Mic, MicOff, SendHorizonal, X, ArrowRight, Loader2, Volume2, VolumeX } from "lucide-react";
import type { VeraCoreState } from "@/components/VeraCore";
import { LivePreview } from "@/components/builder/live-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { usePremiumVoice } from "@/hooks/use-premium-voice";
import { useMicAmplitude } from "@/hooks/use-mic-amplitude";
import { extractCodeBlock } from "@/lib/ai/mock-responses";
import { cn } from "@/lib/utils";

// La esfera neuronal usa @react-three/fiber (WebGL) — se carga solo en el
// cliente. Sin esto, el intento de montar el <Canvas> durante el renderizado
// en servidor no coincidiría con el cliente en la hidratación.
const VeraCore = dynamic(() => import("@/components/VeraCore").then((mod) => mod.VeraCore), {
  ssr: false,
  loading: () => (
    <div className="relative mb-8 aspect-square w-56 animate-pulse rounded-full bg-gradient-to-br from-hud-cyan/10 to-hud-blue/5 sm:w-72 lg:w-80" />
  ),
});

const SUGGESTIONS = [
  "⚡ Crear Landing Page para marca de ropa sostenible",
  "📱 Generar 3 Reels virales para una cafetería de especialidad",
  "🛠️ Optimizar el SEO y velocidad de mi eCommerce",
];

/**
 * Quita los bloques de código del texto para mostrar solo la parte
 * explicativa. Durante el streaming puede llegar un bloque todavía sin
 * cerrar (sin el ``` final): también se recorta desde ahí para no
 * enseñar markdown a medio escribir mientras la respuesta sigue llegando.
 */
function stripCodeBlocks(text: string): string {
  const withoutClosedBlocks = text.replace(/```(?:tsx|jsx|ts|js)?\n[\s\S]*?```/g, "");
  const openFenceIndex = withoutClosedBlocks.indexOf("```");
  const visible = openFenceIndex === -1 ? withoutClosedBlocks : withoutClosedBlocks.slice(0, openFenceIndex);
  return visible.trim();
}

export function VeraHero() {
  const [input, setInput] = useState("");
  const [coreState, setCoreState] = useState<VeraCoreState>("idle");
  const [prose, setProse] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(false);

  const { isSupported: sttSupported, isListening, start, stop } = useSpeechRecognition({
    onFinalResult: (transcript) => handleSubmit(transcript),
  });
  const micAmplitude = useMicAmplitude(isListening);
  const { speak, cancel: cancelSpeech, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  const premium = usePremiumVoice();

  useEffect(() => {
    setCoreState((prev) => {
      if (isListening) return "listening";
      return prev === "listening" ? "idle" : prev;
    });
  }, [isListening]);

  useEffect(() => {
    if (!isSpeaking && !premium.isSpeaking) {
      setCoreState((prev) => (prev === "speaking" ? "idle" : prev));
    }
  }, [isSpeaking, premium.isSpeaking]);

  // El subtítulo es efímero: aparece mientras V.E.R.A responde y se
  // desvanece solo un rato después de callar, para que la protagonista
  // siga siendo la esfera, no un bloque de texto permanente.
  useEffect(() => {
    if (coreState === "idle" && captionVisible && (prose || error)) {
      const timeout = setTimeout(() => setCaptionVisible(false), 4500);
      return () => clearTimeout(timeout);
    }
  }, [coreState, captionVisible, prose, error]);

  async function handleSubmit(text: string) {
    const value = text.trim();
    if (!value || isStreaming) return;

    setInput("");
    setError(null);
    setCode(null);
    setProse("");
    setCaptionVisible(true);
    setCoreState("thinking");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: value }], intent: "chat" }),
      });

      if (!response.body) throw new Error("Sin cuerpo de respuesta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        fullText += decoder.decode(chunk, { stream: true });
        setProse(stripCodeBlocks(fullText));
      }

      const finalCode = extractCodeBlock(fullText);
      const finalProse = stripCodeBlocks(fullText);
      setCode(finalCode);
      setProse(finalProse);
      setIsStreaming(false);

      if (!isMuted && finalProse.trim()) {
        setCoreState("speaking");
        const playedPremium = await premium.speak(finalProse);
        if (!playedPremium) {
          if (ttsSupported) {
            speak(finalProse);
          } else {
            setCoreState("idle");
          }
        }
      } else {
        setCoreState("idle");
      }
    } catch {
      setError("No se pudo conectar con V.E.R.A. Verifica tu red o vuelve a intentarlo.");
      setIsStreaming(false);
      setCoreState("idle");
    }
  }

  function handleMicClick() {
    if (isListening) {
      stop();
      return;
    }
    if (coreState === "speaking") {
      cancelSpeech();
      premium.stop();
    }
    start();
  }

  function handleToggleMute() {
    if (!isMuted) {
      cancelSpeech();
      premium.stop();
    }
    setIsMuted((m) => !m);
  }

  function handleInputSubmit(e: FormEvent) {
    e.preventDefault();
    handleSubmit(input);
  }

  function handleDismissCode() {
    setCode(null);
  }

  return (
    <section className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center sm:py-28">
      <span className="mb-6 flex items-center gap-2 rounded-full border border-hud-cyan/30 bg-hud-cyan/10 px-4 py-1.5 text-xs font-medium text-hud-cyan backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hud-cyan opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-hud-cyan" />
        </span>
        V.E.R.A operativa — habla o escribe para empezar
      </span>

      <VeraCore
        state={coreState}
        amplitude={coreState === "listening" ? micAmplitude : premium.isSpeaking ? premium.amplitude : 0}
        realAmplitudeSpeaking={premium.isSpeaking}
        className="mb-8 w-56 sm:w-72 lg:w-80"
      />

      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Dile a V.E.R.A qué quieres crear
        <br />
        <span className="bg-gradient-to-r from-hud-cyan to-hud-blue bg-clip-text text-transparent">
          y lo verás tomar forma al instante
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
        Tu copiloto de diseño web y redes sociales. Sin código, sin fricción, sin coste de
        infraestructura inicial.
      </p>

      {/* Lo que dice V.E.R.A: un subtítulo efímero, no un bloque de texto
          permanente — la esfera sigue siendo la protagonista. Se reserva
          altura fija para que no salte el resto del layout al aparecer. */}
      <div className="mt-6 flex min-h-[2.75rem] w-full max-w-lg items-start justify-center px-4">
        <p
          className={cn(
            "line-clamp-3 text-sm leading-relaxed transition-opacity duration-700",
            error ? "text-destructive" : "text-hud-cyan/85",
            captionVisible && (prose || error) ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {error ?? prose}
        </p>
      </div>

      <form
        onSubmit={handleInputSubmit}
        className="mt-10 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-hud-cyan/20 bg-white/[0.03] p-2 shadow-[0_0_50px_-12px_rgba(0,240,255,0.25)] backdrop-blur-xl"
      >
        {sttSupported && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleMicClick}
            className={cn(
              "shrink-0 rounded-xl text-hud-cyan hover:bg-hud-cyan/10 hover:text-hud-cyan",
              isListening && "bg-hud-cyan/15"
            )}
            aria-label={isListening ? "Detener escucha" : "Hablar con V.E.R.A"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Crea una landing, unos reels, optimiza tu tienda…"
          className="border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
        />
        {ttsSupported && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleToggleMute}
            className="shrink-0 rounded-xl text-muted-foreground hover:bg-hud-cyan/10 hover:text-hud-cyan"
            aria-label={isMuted ? "Activar voz de V.E.R.A" : "Silenciar voz de V.E.R.A"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        )}
        <Button
          type="submit"
          variant="jarvis"
          size="icon"
          disabled={!input.trim() || isStreaming}
          className="shrink-0 rounded-xl border-hud-cyan/40 bg-hud-cyan/10 text-hud-cyan hover:bg-hud-cyan/20"
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleSubmit(chip.replace(/^\S+\s/, ""))}
            disabled={isStreaming}
            className="rounded-full border border-hud-cyan/20 bg-white/[0.03] px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-hud-cyan/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Vista previa: secundaria y discreta, nunca tapa la esfera —
          aparece debajo, en el flujo normal de la página. */}
      {code && (
        <div className="mt-8 w-full max-w-xl overflow-hidden rounded-xl border border-hud-cyan/15 bg-white/[0.02] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-hud-cyan/10 px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Vista previa generada</span>
            <div className="flex items-center gap-1">
              <Link href="/builder">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs text-hud-cyan hover:text-hud-cyan"
                >
                  Abrir Builder
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleDismissCode} className="h-6 w-6">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="h-56 sm:h-64">
            <LivePreview code={code} isGenerating={isStreaming} />
          </div>
        </div>
      )}
    </section>
  );
}
