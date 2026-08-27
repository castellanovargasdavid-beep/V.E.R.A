import { streamText } from "ai";
import { getAnthropicProvider, mockTextStream } from "@/lib/ai/client";
import { routeMessage } from "@/lib/ai/router";
import { JARVIS_SYSTEM_PROMPT, VOICE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildMockChatReply } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages = (body.messages ?? []) as IncomingMessage[];
  const intent = (body.intent as "chat" | "ui_generation" | undefined) ?? "chat";
  const mode = body.mode as "voice" | undefined;
  const systemPrompt = mode === "voice" ? VOICE_SYSTEM_PROMPT : JARVIS_SYSTEM_PROMPT;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const decision = routeMessage({ content: lastUserMessage?.content ?? "", intent });

  const anthropic = getAnthropicProvider();

  if (!anthropic) {
    const reply = buildMockChatReply(lastUserMessage?.content ?? "", mode);
    return new Response(mockTextStream(reply), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-model-tier": decision.tier,
      },
    });
  }

  const result = streamText({
    model: anthropic(decision.modelId),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse({
    headers: {
      "x-model-tier": decision.tier,
    },
  });
}
