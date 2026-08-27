import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/dashboard/project-card";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";
import { getDashboardMetrics, getProjectSummaries } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const [projects, metrics] = await Promise.all([getProjectSummaries(), getDashboardMetrics()]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Panorama de tus proyectos y consumo de IA.
          </p>
        </div>
        <Link href="/builder">
          <Button variant="jarvis" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Button>
        </Link>
      </header>

      <AnalyticsPanel metrics={metrics} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tus proyectos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
