export type ProjectStatus = "draft" | "generating" | "ready" | "published" | "archived";

export type ProjectPlatform = "web" | "landing" | "ecommerce" | "portfolio";

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  platform: ProjectPlatform;
  status: ProjectStatus;
  code: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  updatedAt: string;
  visits: number;
  conversionRate: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  platform: ProjectPlatform;
}
