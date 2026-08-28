import "server-only";

export type TtsEngine = "elevenlabs" | "openai";

export interface SynthesisResult {
  audio: ArrayBuffer;
  contentType: string;
  engine: TtsEngine;
}

// Voz premade "George" de ElevenLabs — timbre británico, cálido y contenido,
// el más cercano de las voces de catálogo al perfil de mayordomo de
// ingeniería de élite que pide V.E.R.A (frente a Adam/Brian, más
// americanos y "narrador de documental"). Los IDs de voces premade de
// ElevenLabs pueden cambiar con el tiempo: si esta ya no resuelve en tu
// cuenta, sustitúyela por la que prefieras desde tu voice library.
const DEFAULT_ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function isOpenAiTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Opción A — ElevenLabs, calidad máxima de estudio. `stability: 0.75`
 * mantiene la compostura sin fluctuaciones emocionales de una frase a la
 * siguiente (nada de subidas de tono dramáticas); `similarity_boost: 0.85`
 * prioriza la claridad de pronunciación sobre la voz de referencia;
 * `style: 0.10` deja solo un rastro de expresividad — lo justo para que no
 * suene plano, sin caer en la sobreactuación.
 */
async function synthesizeWithElevenLabs(text: string): Promise<SynthesisResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_ELEVENLABS_MODEL_ID;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.85,
        style: 0.1,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs respondió ${response.status}`);
  }

  return { audio: await response.arrayBuffer(), contentType: "audio/mpeg", engine: "elevenlabs" };
}

/**
 * Opción B — OpenAI TTS, rápida y de bajo coste. Voz "onyx" (la más grave y
 * serena del catálogo) con `speed: 0.95` para la cadencia pausada que pide
 * el perfil; `tts-1` prioriza latencia sobre `tts-1-hd`, razonable para un
 * asistente conversacional que debe sonar ágil.
 */
async function synthesizeWithOpenAi(text: string): Promise<SynthesisResult> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_TTS_MODEL || "tts-1";
  const voice = process.env.OPENAI_TTS_VOICE || "onyx";

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, voice, input: text, speed: 0.95 }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS respondió ${response.status}`);
  }

  return { audio: await response.arrayBuffer(), contentType: "audio/mpeg", engine: "openai" };
}

/**
 * Motor de síntesis modular: prueba ElevenLabs primero (mejor calidad),
 * luego OpenAI TTS (más barato y rápido), y devuelve `null` si ninguno
 * está configurado — en ese caso el cliente recurre a la Opción C, la Web
 * Speech API nativa del navegador (gratis, sin llamada de red).
 */
export async function synthesizeSpeech(text: string): Promise<SynthesisResult | null> {
  if (isElevenLabsConfigured()) {
    try {
      return await synthesizeWithElevenLabs(text);
    } catch {
      // Si ElevenLabs falla (cuota agotada, voz inválida...), se intenta
      // con OpenAI antes de rendirse — degradar de opción A a B, nunca
      // dejar al usuario sin respuesta si hay una alternativa configurada.
    }
  }

  if (isOpenAiTtsConfigured()) {
    try {
      return await synthesizeWithOpenAi(text);
    } catch {
      // Cae al retorno null de abajo — el cliente pasa a voz de navegador.
    }
  }

  return null;
}
