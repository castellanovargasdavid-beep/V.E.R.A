"use client";

import { useState } from "react";
import { Copy, Check, Instagram, Linkedin, Music2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SocialPost } from "@/types/prompt";

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-400" },
  tiktok: { label: "TikTok", icon: Music2, color: "text-fuchsia-400" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-sky-400" },
} as const;

export function SocialCopyCard({ post }: { post: SocialPost }) {
  const [copied, setCopied] = useState(false);
  const meta = PLATFORM_META[post.platform];
  const Icon = meta.icon;

  const fullText = `${post.headline}\n\n${post.caption}\n\n${post.hashtags.join(" ")}\n\n${post.callToAction}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
      </CardContent>
    </Card>
  );
}
