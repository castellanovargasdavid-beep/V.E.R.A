"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Mic, MicOff, SendHorizonal, X, ArrowRight, Loader2 } from "lucide-react";
import { VeraCore, type VeraCoreState } from "@/components/VeraCore";
import { LivePreview } from "@/components/builder/live-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useMicAmplitude } from "@/hooks/use-mic-amplitude";
import { extractCodeBlock } from "@/lib/ai/mock-responses";
import { cn } from "@/lib/utils";

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
  const [showPreview, setShowPreview] = useState(false);
  const [prose, setProse] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isSupported: sttSupported, isListening, start, stop } = useSpeechRecognition({
    onFinalResult: (transcript) => handleSubmit(transcript),
  });
  const micAmplitude = useMicAmplitude(isListening);

  useEffect(() => {
    setCoreState((prev) => {
      if (isListening) return "listening";
      return prev === "listening" ? "idle" : prev;
    });
  }, [isListening]);

  async function handleSubmit(text: string) {
    const value = text.trim();
    if (!value || isStreaming) return;

    setInput("");
    setError(null);
    setCode(null);
    setProse("");
    setShowPreview(true);
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

      setCode(extractCodeBlock(fullText));
      setProse(stripCodeBlocks(fullText));
    } catch {
      setError("No se pudo conectar con V.E.R.A. Verifica tu red o vuelve a intentarlo.");
    } finally {
      setIsStreaming(false);
      setCoreState("idle");
    }
  }

  function handleMicClick() {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }

  function handleInputSubmit(e: FormEvent) {
    e.preventDefault();
    handleSubmit(input);
  }

  function handleClosePreview() {
    setShowPreview(false);
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
        amplitude={micAmplitude}
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

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-hud-bg/80 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-hud-cyan/20 bg-hud-bg2/95 shadow-[0_0_80px_-20px_rgba(0,240,255,0.35)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between border-b border-hud-cyan/15 px-5 py-3">
              <span className="font-mono text-sm font-semibold text-hud-cyan">
                V.E.R.A {isStreaming ? "está generando…" : "responde"}
              </span>
              <Button variant="ghost" size="icon" onClick={handleClosePreview} className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <>
                  {prose && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{prose}</p>}
                  {code && (
                    <div className="mt-4 h-80">
                      <LivePreview code={code} isGenerating={isStreaming} />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-hud-cyan/15 px-5 py-3">
              <span className="text-xs text-muted-foreground">
                Esto es solo un adelanto — sigue creando en el Builder completo.
              </span>
              <Link href="/builder">
                <Button variant="jarvis" size="sm" className="gap-1.5">
                  Abrir Builder
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
