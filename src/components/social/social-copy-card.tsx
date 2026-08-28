"use client";

import { useState } from "react";
import { Copy, Check, Instagram, Linkedin, Music2, Clapperboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SocialPost, SocialScript } from "@/types/prompt";

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-400" },
  tiktok: { label: "TikTok", icon: Music2, color: "text-fuchsia-400" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-sky-400" },
} as const;

const SCRIPT_STEPS: { key: keyof SocialScript; label: string }[] = [
  { key: "hook", label: "Gancho" },
  { key: "retention", label: "Retención" },
  { key: "cta", label: "CTA" },
];

function formatScript(headline: string, script: SocialScript): string {
  return `GUIÓN — ${headline}\n\nGANCHO\n${script.hook}\n\nRETENCIÓN\n${script.retention}\n\nCTA\n${script.cta}`;
}

export function SocialCopyCard({ post }: { post: SocialPost }) {
  const [copied, setCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const meta = PLATFORM_META[post.platform];
  const Icon = meta.icon;
  const script = post.script;

  const fullText = `${post.headline}\n\n${post.caption}\n\n${post.hashtags.join(" ")}\n\n${post.callToAction}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCopyScript() {
    if (!script) return;
    await navigator.clipboard.writeText(formatScript(post.headline, script));
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${meta.color}`} />
          {meta.label}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 px-2 text-xs">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-semibold">{post.headline}</p>
        <p className="text-sm text-muted-foreground">{post.caption}</p>
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-xs font-medium text-jarvis">{post.callToAction}</p>

        {script && (
          <div className="mt-2 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.04] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-fuchsia-400">
                <Clapperboard className="h-3.5 w-3.5" />
                Guión para el vídeo
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyScript}
                className="h-6 gap-1 px-2 text-[0.7rem] text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
              >
                {scriptCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {scriptCopied ? "Copiado" : "Copiar guión"}
              </Button>
            </div>
            <ol className="space-y-2">
              {SCRIPT_STEPS.map(({ key, label }, i) => (
                <li key={key} className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-fuchsia-500/40 text-[0.6rem] font-semibold text-fuchsia-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-fuchsia-300/90">
                      {label}
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/90">{script[key]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
