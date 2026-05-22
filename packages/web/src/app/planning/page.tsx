import type { Metadata } from "next";
import { PlanningDashboard } from "@/components/PlanningDashboard";
import {
  getPlanningPageData,
  getPlanningProjectName,
  resolvePlanningProjectFilter,
} from "@/lib/planning-page-data";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  searchParams: Promise<{ project?: string }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const projectFilter = resolvePlanningProjectFilter(searchParams.project);
  const projectName = getPlanningProjectName(projectFilter);
  return { title: { absolute: `ao | ${projectName} Planning` } };
}

export default async function PlanningRoute(props: {
  searchParams: Promise<{ project?: string }>;
}) {
  const searchParams = await props.searchParams;
  const projectFilter = resolvePlanningProjectFilter(searchParams.project);
  const pageData = await getPlanningPageData(projectFilter);

  return (
    <PlanningDashboard
      planningSessions={pageData.planningSessions}
      projectId={pageData.selectedProjectId}
      projectName={pageData.projectName}
      projects={pageData.projects}
      sidebarSessions={pageData.sidebarSessions}
      orchestrators={pageData.orchestrators}
      dashboardLoadError={pageData.dashboardLoadError}
    />
  );
}
