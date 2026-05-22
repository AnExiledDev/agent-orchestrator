"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MOBILE_BREAKPOINT, useMediaQuery } from "@/hooks/useMediaQuery";
import type { ProjectInfo } from "@/lib/project-name";
import {
  projectDashboardPath,
  projectPlanningPath,
  projectReviewPath,
  projectSessionPath,
} from "@/lib/routes";
import type { DashboardOrchestratorLink, DashboardSession } from "@/lib/types";
import { isDashboardSessionDone } from "@/lib/types";
import { ProjectSidebar } from "./ProjectSidebar";
import { ToastProvider } from "./Toast";
import { SidebarContext } from "./workspace/SidebarContext";

export type PlanningColumn =
  | "exploring"
  | "plan_ready"
  | "under_review"
  | "ready_to_promote"
  | "promoted";

const PLANNING_COLUMNS: readonly PlanningColumn[] = [
  "exploring",
  "plan_ready",
  "under_review",
  "ready_to_promote",
  "promoted",
];

const COLUMN_LABELS: Record<PlanningColumn, string> = {
  exploring: "Exploring",
  plan_ready: "Plan Ready",
  under_review: "Under Review",
  ready_to_promote: "Ready to Promote",
  promoted: "Promoted",
};

const COLUMN_HINTS: Record<PlanningColumn, string> = {
  exploring: "Agent is actively researching the codebase.",
  plan_ready: "Agent reported research_complete — plan is written.",
  under_review: "A review run exists for this planning session.",
  ready_to_promote: "Review is clean, awaiting promotion decision.",
  promoted: "Plan has been promoted to a coding session.",
};

export function getPlanningColumn(session: DashboardSession): PlanningColumn {
  if (session.metadata["promotedTo"]) return "promoted";

  const reason = session.lifecycle?.session?.reasonLabel?.toLowerCase();
  if (reason?.includes("research_complete") || session.metadata["researchComplete"] === "true") {
    if (session.metadata["reviewClean"] === "true") return "ready_to_promote";
    if (session.metadata["reviewRunId"]) return "under_review";
    return "plan_ready";
  }

  if (isDashboardSessionDone(session)) return "plan_ready";

  return "exploring";
}

interface PlanningDashboardProps {
  planningSessions: DashboardSession[];
  sidebarSessions?: DashboardSession[];
  orchestrators?: DashboardOrchestratorLink[];
  projectId?: string;
  projectName: string;
  projects: ProjectInfo[];
  dashboardLoadError?: string;
}

function PlanningDashboardInner({
  planningSessions,
  sidebarSessions = [],
  orchestrators = [],
  projectId,
  projectName,
  projects,
  dashboardLoadError,
}: PlanningDashboardProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProjectsView = !projectId;
  const headerProjectLabel = projectName ?? (allProjectsView ? "All projects" : "Planning");

  const codingHref = projectId ? projectDashboardPath(projectId) : "/?project=all";
  const reviewHref = projectReviewPath(projectId);
  const planningHref = projectPlanningPath(projectId);

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen((c) => !c);
    } else {
      setSidebarCollapsed((c) => !c);
    }
  };

  const grouped = useMemo(() => {
    const result: Record<PlanningColumn, DashboardSession[]> = {
      exploring: [],
      plan_ready: [],
      under_review: [],
      ready_to_promote: [],
      promoted: [],
    };
    for (const session of planningSessions) {
      const col = getPlanningColumn(session);
      result[col].push(session);
    }
    return result;
  }, [planningSessions]);

  return (
    <SidebarContext.Provider
      value={{ onToggleSidebar: handleToggleSidebar, mobileSidebarOpen: mobileMenuOpen }}
    >
      <div className="dashboard-app-shell">
        <header className="dashboard-app-header">
          <button
            type="button"
            className="dashboard-app-sidebar-toggle"
            onClick={handleToggleSidebar}
            aria-label="Toggle sidebar"
          >
            {isMobile ? (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            )}
          </button>
          <div className="dashboard-app-header__brand">
            <span>Agent Orchestrator</span>
          </div>
          <span className="dashboard-app-header__sep" aria-hidden="true" />
          <span className="dashboard-app-header__project">{headerProjectLabel}</span>
          <nav className="workspace-mode-switch" aria-label="Workspace mode">
            <Link href={codingHref} className="workspace-mode-switch__item">
              Coding
            </Link>
            <Link href={reviewHref} className="workspace-mode-switch__item">
              Reviews
            </Link>
            <Link
              href={planningHref}
              className="workspace-mode-switch__item workspace-mode-switch__item--active"
              aria-current="page"
            >
              Planning
            </Link>
          </nav>
          <div className="dashboard-app-header__spacer" />
        </header>

        <div className="dashboard-body" data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}>
          <ProjectSidebar
            sessions={sidebarSessions}
            orchestrators={orchestrators}
            projects={projects}
            activeProjectId={projectId}
            activeSessionId={undefined}
            collapsed={!isMobile && sidebarCollapsed}
            onToggleCollapsed={handleToggleSidebar}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

          <main className="dashboard-main flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="dashboard-main__subhead">
              <h1 className="dashboard-main__title">Planning</h1>
              <p className="dashboard-main__subtitle">
                Research sessions that produce implementation plans before coding begins.
              </p>
            </div>

            {dashboardLoadError ? (
              <div className="dashboard-main__body">
                <div className="planning-board-empty">
                  <p>Failed to load planning data: {dashboardLoadError}</p>
                </div>
              </div>
            ) : planningSessions.length === 0 ? (
              <div className="dashboard-main__body">
                <div className="planning-board-empty">
                  <h2>No planning sessions</h2>
                  <p>
                    Spawn a planning session with{" "}
                    <code>ao spawn --mode planning</code> or{" "}
                    <code>ao spawn --preset planning</code>
                  </p>
                </div>
              </div>
            ) : (
              <div className="dashboard-main__body">
                <div
                  className="kanban-board"
                  data-columns={PLANNING_COLUMNS.length}
                  style={{ "--kanban-column-count": PLANNING_COLUMNS.length } as React.CSSProperties}
                >
                  {PLANNING_COLUMNS.map((col) => (
                    <PlanningColumnView
                      key={col}
                      column={col}
                      sessions={grouped[col]}
                      projectId={projectId}
                    />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

function PlanningColumnView({
  column,
  sessions,
  projectId,
}: {
  column: PlanningColumn;
  sessions: DashboardSession[];
  projectId?: string;
}) {
  return (
    <div className="kanban-column" data-level={column}>
      <div className="kanban-column__header">
        <div className="kanban-column__title-row">
          <span className="kanban-column__dot" data-level={column} />
          <h2 className="kanban-column__title">{COLUMN_LABELS[column]}</h2>
          {sessions.length > 0 ? (
            <span className="kanban-column__count">{sessions.length}</span>
          ) : null}
        </div>
        <p className="kanban-column__caption">{COLUMN_HINTS[column]}</p>
      </div>
      <div className="kanban-column-body">
        <div className="kanban-column__stack">
          {sessions.length === 0 ? (
            <div className="planning-column-empty">No sessions</div>
          ) : (
            sessions.map((session) => (
              <PlanningSessionCard key={session.id} session={session} projectId={projectId} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getSessionTitle(session: DashboardSession): string {
  if (session.displayName) return session.displayName;
  if (session.userPrompt) return session.userPrompt.slice(0, 80);
  if (session.issueId) return `Issue ${session.issueId}`;
  return session.id;
}

function PlanningSessionCard({
  session,
  projectId,
}: {
  session: DashboardSession;
  projectId?: string;
}) {
  const title = getSessionTitle(session);
  const href = projectSessionPath(projectId ?? session.projectId, session.id);
  const promotedTo = session.metadata["promotedTo"];

  return (
    <Link href={href} className="planning-session-card">
      <div className="planning-session-card__header">
        <span className="planning-session-card__id">{session.id}</span>
        <span className="planning-session-card__time">
          {formatRelativeTime(session.lastActivityAt)}
        </span>
      </div>
      <div className="planning-session-card__title">{title}</div>
      {session.summary ? (
        <div className="planning-session-card__summary">{session.summary}</div>
      ) : null}
      {promotedTo ? (
        <div className="planning-session-card__promoted">
          Promoted to {promotedTo}
        </div>
      ) : null}
    </Link>
  );
}

export function PlanningDashboard(props: PlanningDashboardProps) {
  return (
    <ToastProvider>
      <PlanningDashboardInner {...props} />
    </ToastProvider>
  );
}
