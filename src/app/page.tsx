import Link from "next/link";
import { ArrowRight, Cpu, Sparkles, Wand2, Share2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(199_89%_10%),_hsl(222_47%_6%)_60%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-6 w-6 text-jarvis" />
          <span className="font-mono text-lg font-bold tracking-wide">V.E.R.A</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="jarvis" size="sm">
              Empezar gratis
            </Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center">
        <span className="mb-4 flex items-center gap-2 rounded-full border border-jarvis/30 bg-jarvis/10 px-4 py-1.5 text-xs font-medium text-jarvis">
          <Sparkles className="h-3.5 w-3.5" />
          Copiloto de IA estilo J.A.R.V.I.S.
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Diseña tu web y tu contenido social
          <br />
          <span className="bg-gradient-to-r from-jarvis to-sky-300 bg-clip-text text-transparent">
            hablando con tu copiloto
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          V.E.R.A convierte tus ideas en interfaces reales y en campañas de redes sociales listas
          para publicar. Sin código, sin fricción, sin coste de infraestructura inicial.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="jarvis" size="lg" className="gap-2">
              Entrar al dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/builder">
            <Button variant="outline" size="lg">
              Probar el builder
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-border/60 bg-card/60">
            <CardHeader>
              <div className="mb-2 w-fit rounded-md bg-jarvis/10 p-2 text-jarvis">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
