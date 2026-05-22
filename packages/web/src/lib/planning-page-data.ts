import "server-only";

import { isOrchestratorSession } from "@aoagents/ao-core";
import { getServices } from "@/lib/services";
import {
  getAllProjects,
  getPrimaryProjectId,
  getProjectName,
  type ProjectInfo,
} from "@/lib/project-name";
import { listDashboardOrchestrators, sessionToDashboard } from "@/lib/serialize";
import type { DashboardOrchestratorLink, DashboardSession } from "@/lib/types";

export interface PlanningPageData {
  planningSessions: DashboardSession[];
  sidebarSessions: DashboardSession[];
  orchestrators: DashboardOrchestratorLink[];
  projectName: string;
  projects: ProjectInfo[];
  selectedProjectId?: string;
  dashboardLoadError?: string;
}

export function getPlanningProjectName(projectFilter: string | undefined): string {
  if (projectFilter === "all") return "All Projects";
  const projects = getAllProjects();
  if (projectFilter) {
    const selected = projects.find((p) => p.id === projectFilter);
    if (selected) return selected.name;
  }
  return getProjectName();
}

export function resolvePlanningProjectFilter(project?: string): string {
  if (project === "all") return "all";
  const projects = getAllProjects();
  if (project && projects.some((p) => p.id === project)) {
    return project;
  }
  return getPrimaryProjectId();
}

export async function getPlanningPageData(project?: string): Promise<PlanningPageData> {
  const projectFilter = resolvePlanningProjectFilter(project);
  const pageData: PlanningPageData = {
    planningSessions: [],
    sidebarSessions: [],
    orchestrators: [],
    projectName: getPlanningProjectName(projectFilter),
    projects: getAllProjects(),
    selectedProjectId: projectFilter === "all" ? undefined : projectFilter,
  };

  try {
    const { config, sessionManager } = await getServices();
    const projectIds =
      projectFilter === "all" ? Object.keys(config.projects) : [projectFilter];
    const allSessions = await sessionManager.listCached();
    const visibleSessions = allSessions.filter((s) => projectIds.includes(s.projectId));

    const allSessionPrefixes = Object.entries(config.projects).map(
      ([pid, p]) => p.sessionPrefix ?? pid,
    );

    const dashboardSessions = visibleSessions
      .filter(
        (s) =>
          !isOrchestratorSession(
            s,
            config.projects[s.projectId]?.sessionPrefix ?? s.projectId,
            allSessionPrefixes,
          ),
      )
      .map(sessionToDashboard);

    pageData.planningSessions = dashboardSessions.filter(
      (s) => s.metadata["mode"] === "planning",
    );
    pageData.sidebarSessions = allSessions
      .filter(
        (s) =>
          !isOrchestratorSession(
            s,
            config.projects[s.projectId]?.sessionPrefix ?? s.projectId,
            allSessionPrefixes,
          ),
      )
      .map(sessionToDashboard);
    pageData.orchestrators = listDashboardOrchestrators(allSessions, config.projects);
  } catch (err) {
    pageData.dashboardLoadError =
      err instanceof Error ? err.message.split(/\r?\n/)[0]?.trim() || "Failed to load." : "Failed to load.";
  }

  return pageData;
}
