"use client";

import { useState } from "react";
import { Loader2, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialCopyCard } from "@/components/social/social-copy-card";
import { SocialBannerGenerator } from "@/components/SocialBannerGenerator";
import { MOCK_SOCIAL_CAMPAIGN } from "@/lib/mock/data";
import type { SocialCampaign } from "@/types/prompt";

export default function SocialPage() {
  const [content, setContent] = useState(
    "Landing de lanzamiento para una app de finanzas personales dirigida a jóvenes profesionales."
  );
  const [campaign, setCampaign] = useState<SocialCampaign>(MOCK_SOCIAL_CAMPAIGN);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      setCampaign(data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="flex items-center gap-3">
        <div className="rounded-md bg-jarvis/10 p-2 text-jarvis">
          <Share2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Agente Multicanal</h1>
          <p className="text-sm text-muted-foreground">
            Convierte el contenido de tu proyecto en copy listo para publicar.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Pega o describe el contenido web sobre el que quieres generar copy social..."
        />
        <Button variant="jarvis" onClick={handleGenerate} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? "Generando campaña…" : "Generar campaña multicanal"}
        </Button>
      </div>

      <Tabs defaultValue="copys">
        <TabsList>
          <TabsTrigger value="copys">📋 Copys</TabsTrigger>
          <TabsTrigger value="graphics">🎨 Creatividades Gráficas</TabsTrigger>
        </TabsList>
        <TabsContent value="copys">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaign.posts.map((post) => (
              <SocialCopyCard key={post.platform} post={post} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="graphics">
          <SocialBannerGenerator campaign={campaign} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
