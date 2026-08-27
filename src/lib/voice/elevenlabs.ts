const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Voz premade "Rachel" de ElevenLabs, usada como valor por defecto razonable.
// Para una voz en español cálida y natural, sustituye ELEVENLABS_VOICE_ID en
// tu .env por un ID de voz elegido en https://elevenlabs.io/app/voice-library
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/**
 * Sintetiza voz natural con ElevenLabs (modelo multilingüe, ajustado para
 * sonar cálido y suave en lugar de robótico). Devuelve el audio en MP3.
 * Solo se invoca cuando ELEVENLABS_API_KEY está configurada; en caso
 * contrario la ruta que la llama nunca la invoca (fallback a voz del navegador).
 */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs respondió ${response.status}`);
  }

  return response.arrayBuffer();
}
