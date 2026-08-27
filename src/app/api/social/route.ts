import { generateText } from "ai";
import { getAnthropicProvider } from "@/lib/ai/client";
import { getModelId } from "@/lib/ai/router";
import { SOCIAL_COPY_SYSTEM_PROMPT, buildSocialCopyUserPrompt } from "@/lib/ai/prompts";
import { MOCK_SOCIAL_CAMPAIGN } from "@/lib/mock/data";
import type { SocialCampaign, SocialCopyRequest } from "@/types/prompt";

export const runtime = "nodejs";

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\n([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1] : text;
  return JSON.parse(jsonText);
}

function buildMockCampaign(content: string): SocialCampaign {
  return {
    ...MOCK_SOCIAL_CAMPAIGN,
    sourceSummary: content.slice(0, 200),
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  const { content, tone } = (await req.json()) as SocialCopyRequest;

  if (!content || !content.trim()) {
    return Response.json({ error: "El campo 'content' es obligatorio." }, { status: 400 });
  }

  const anthropic = getAnthropicProvider();

  if (!anthropic) {
    return Response.json(buildMockCampaign(content));
  }

  try {
    const { text } = await generateText({
      model: anthropic(getModelId("fast")),
      system: SOCIAL_COPY_SYSTEM_PROMPT,
      prompt: buildSocialCopyUserPrompt(content, tone),
    });

    const campaign = extractJson(text) as SocialCampaign;
    return Response.json(campaign);
  } catch {
    return Response.json(buildMockCampaign(content));
  }
}
