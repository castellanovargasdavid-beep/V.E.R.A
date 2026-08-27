import { createClient } from "@/lib/supabase/server";
import { MOCK_METRICS, MOCK_PROJECTS } from "@/lib/mock/data";
import type { ProjectSummary } from "@/types/project";
import type { DashboardMetrics } from "@/types/metrics";

/**
 * Obtiene los proyectos del usuario autenticado desde Supabase.
 * Si Supabase no está configurado, o la consulta falla, recurre a mock data
 * para que el dashboard siempre sea funcional.
 */
export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_PROJECTS;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return MOCK_PROJECTS;

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error || !data || data.length === 0) return MOCK_PROJECTS;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    updatedAt: row.updated_at,
    visits: 0,
    conversionRate: 0,
  }));
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return MOCK_METRICS;
}
