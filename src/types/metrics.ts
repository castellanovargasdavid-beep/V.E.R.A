export interface MetricPoint {
  date: string;
  value: number;
}

export interface DashboardMetrics {
  totalProjects: number;
  totalGenerations: number;
  activeUsersToday: number;
  averageBuildTimeSeconds: number;
  visitsTrend: MetricPoint[];
  generationsByModel: {
    fast: number;
    reasoning: number;
  };
}
