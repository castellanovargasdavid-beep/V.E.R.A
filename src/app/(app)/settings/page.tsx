import { createClient } from "@/lib/supabase/server";
import { listLinkedChannels } from "@/lib/integrations/links";
import { MobileIntegrationsPanel } from "@/components/settings/mobile-integrations-panel";
import type { IntegrationLink } from "@/types/integrations";

export default async function SettingsPage() {
  const supabase = await createClient();

  let status: "unconfigured" | "unauthenticated" | "ready" = "unconfigured";
  let links: IntegrationLink[] = [];

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      status = "ready";
      links = await listLinkedChannels(supabase, user.id);
    } else {
      status = "unauthenticated";
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Preferencias de tu cuenta y canales conectados.</p>
      </header>

      <MobileIntegrationsPanel status={status} initialLinks={links} />
    </div>
  );
}
