import Link from "next/link";
import { Eye, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { ProjectSummary, ProjectStatus } from "@/types/project";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Borrador",
  generating: "Generando",
  ready: "Listo",
  published: "Publicado",
  archived: "Archivado",
};

const STATUS_VARIANT: Record<ProjectStatus, "default" | "outline" | "success" | "warning" | "jarvis"> = {
  draft: "outline",
  generating: "warning",
  ready: "jarvis",
  published: "success",
  archived: "default",
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link href="/builder">
      <Card className="transition-colors hover:border-jarvis/40">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <CardTitle className="text-base">{project.name}</CardTitle>
          <Badge variant={STATUS_VARIANT[project.status]}>{STATUS_LABEL[project.status]}</Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {project.visits.toLocaleString("es-ES")}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {project.conversionRate}%
            </span>
          </div>
          <span>{formatRelativeTime(project.updatedAt)}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
