import "server-only";

export function isTranscriptionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Transcribe una nota de voz descargándola de `audioUrl` y mandándola al
 * endpoint de transcripción de OpenAI (Whisper) — la API de audio-a-texto
 * de bajo coste más estándar; Claude no transcribe audio de forma nativa,
 * así que el pipeline de IA principal de V.E.R.A. no cubre este paso.
 * Devuelve `null` si no hay OPENAI_API_KEY configurada o si algo falla —
 * quien la llama debe degradar con un mensaje claro, nunca lanzar.
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  filename: string,
  fetchInit?: RequestInit
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const audioRes = await fetch(audioUrl, fetchInit);
    if (!audioRes.ok) return null;
    const audioBlob = await audioRes.blob();

    const form = new FormData();
    form.append("file", audioBlob, filename);
    form.append("model", "whisper-1");

    const transcriptionRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!transcriptionRes.ok) return null;

    const data = (await transcriptionRes.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
