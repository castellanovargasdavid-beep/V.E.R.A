import type { ComponentType } from "react";
import { Activity, Boxes, Gauge, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/types/metrics";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="rounded-md bg-jarvis/10 p-2.5 text-jarvis">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPanel({ metrics }: { metrics: DashboardMetrics }) {
  const maxTrend = Math.max(...metrics.visitsTrend.map((p) => p.value), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Boxes} label="Proyectos" value={String(metrics.totalProjects)} />
        <StatCard icon={Activity} label="Generaciones IA" value={String(metrics.totalGenerations)} />
        <StatCard icon={Users} label="Usuarios activos hoy" value={String(metrics.activeUsersToday)} />
        <StatCard
          icon={Gauge}
          label="Tiempo medio de build"
          value={`${metrics.averageBuildTimeSeconds.toFixed(1)}s`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Visitas — últimos 7 días</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-2">
            {metrics.visitsTrend.map((point) => (
              <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm bg-jarvis/60"
                  style={{ height: `${Math.max((point.value / maxTrend) * 100, 4)}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{point.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Uso del Model Router</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Haiku (rápido/económico)</span>
            <span className="font-medium">{metrics.generationsByModel.fast}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sonnet (razonamiento)</span>
            <span className="font-medium">{metrics.generationsByModel.reasoning}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
