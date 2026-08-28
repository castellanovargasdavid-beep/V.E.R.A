import Link from "next/link";
import { Cpu, Wand2, Share2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VeraHero } from "@/components/landing/vera-hero";
import { WebAuditScanner } from "@/components/WebAuditScanner";

const FEATURES = [
  {
    icon: Wand2,
    title: "Genera UI en segundos",
    description:
      "Describe tu web en lenguaje natural y V.E.R.A genera componentes React con Tailwind, previsualizados al instante.",
  },
  {
    icon: Share2,
    title: "Agente multicanal",
    description:
      "A partir de tu web, genera automáticamente copy adaptado para Instagram, TikTok y LinkedIn.",
  },
  {
    icon: Gauge,
    title: "IA de bajo coste",
    description:
      "Un enrutador de modelos usa IA económica para tareas simples y modelos avanzados solo cuando hace falta.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-hud-bg text-foreground">
      {/* Fondo: gradiente radial profundo + malla cibernética sutil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,112,243,0.16), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 15%, rgba(139,92,246,0.1), transparent 60%), #050811",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] animate-grid-drift"
        style={{
          backgroundImage:
            "linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to bottom, transparent 0%, #050811 95%)" }}
      />

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-hud-cyan" />
            <span className="font-mono text-lg font-bold tracking-wide">V.E.R.A</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                variant="jarvis"
                size="sm"
                className="border-hud-cyan/40 bg-hud-cyan/10 text-hud-cyan hover:bg-hud-cyan/20"
              >
                Empezar gratis
              </Button>
            </Link>
          </nav>
        </header>

        <VeraHero />

        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="border-hud-cyan/15 bg-white/[0.02] backdrop-blur-xl transition-colors hover:border-hud-cyan/30"
            >
              <CardHeader>
                <div className="mb-2 w-fit rounded-md bg-hud-cyan/10 p-2 text-hud-cyan">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <WebAuditScanner />
      </div>
    </main>
  );
}
