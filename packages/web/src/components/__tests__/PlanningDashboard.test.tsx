import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanningDashboard, getPlanningColumn } from "../PlanningDashboard";
import type { DashboardSession } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/planning",
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
  MOBILE_BREAKPOINT: "(max-width: 640px)",
}));

function makePlanningSession(overrides: Partial<DashboardSession> = {}): DashboardSession {
  return {
    id: "test-1",
    projectId: "proj",
    status: "working" as any,
    activity: "active",
    branch: "session/test-1",
    issueId: null,
    issueUrl: null,
    issueLabel: null,
    issueTitle: null,
    userPrompt: "Investigate the auth system",
    displayName: "Investigate the auth system",
    displayNameUserSet: false,
    summary: null,
    summaryIsFallback: false,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    pr: null,
    metadata: { mode: "planning" },
    agentReportAudit: [],
    ...overrides,
  };
}

describe("getPlanningColumn", () => {
  it("returns 'exploring' for active planning sessions", () => {
    const session = makePlanningSession();
    expect(getPlanningColumn(session)).toBe("exploring");
  });

  it("returns 'promoted' when promotedTo metadata is set", () => {
    const session = makePlanningSession({
      metadata: { mode: "planning", promotedTo: "test-2" },
    });
    expect(getPlanningColumn(session)).toBe("promoted");
  });

  it("returns 'plan_ready' for done sessions without review", () => {
    const session = makePlanningSession({
      status: "done" as any,
      lifecycle: {
        sessionState: "done",
        sessionReason: "research_complete",
        prState: "not_created",
        prReason: "not_created",
        runtimeState: "exited",
        runtimeReason: "agent_process_exited",
        session: {
          state: "done",
          reason: "research_complete",
          label: "done",
          reasonLabel: "research_complete",
        },
        pr: {
          state: "not_created",
          reason: "not_created",
          label: "not created",
          reasonLabel: "not created",
        },
        runtime: {
          state: "exited",
          reason: "agent_process_exited",
          label: "exited",
          reasonLabel: "agent process exited",
        },
        legacyStatus: "done" as any,
        evidence: null,
        detectingAttempts: 0,
        detectingEscalatedAt: null,
        summary: "done",
        guidance: null,
      },
    });
    expect(getPlanningColumn(session)).toBe("plan_ready");
  });

  it("returns 'under_review' when reviewRunId metadata is set and research complete", () => {
    const session = makePlanningSession({
      metadata: { mode: "planning", researchComplete: "true", reviewRunId: "rev-1" },
    });
    expect(getPlanningColumn(session)).toBe("under_review");
  });

  it("returns 'ready_to_promote' when review is clean and research complete", () => {
    const session = makePlanningSession({
      metadata: { mode: "planning", researchComplete: "true", reviewClean: "true" },
    });
    expect(getPlanningColumn(session)).toBe("ready_to_promote");
  });
});

describe("PlanningDashboard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders empty state when no planning sessions exist", () => {
    render(
      <PlanningDashboard
        planningSessions={[]}
        projectName="Test Project"
        projects={[]}
      />,
    );
    expect(screen.getByText("No planning sessions")).toBeTruthy();
    expect(screen.getByText(/ao spawn --mode planning/)).toBeTruthy();
  });

  it("renders the Planning tab as active", () => {
    render(
      <PlanningDashboard
        planningSessions={[]}
        projectName="Test Project"
        projects={[]}
      />,
    );
    const planningLink = screen.getByText("Planning");
    expect(planningLink.getAttribute("aria-current")).toBe("page");
  });

  it("renders kanban columns with sessions", () => {
    const sessions = [makePlanningSession()];
    render(
      <PlanningDashboard
        planningSessions={sessions}
        projectName="Test Project"
        projects={[]}
      />,
    );
    expect(screen.getByText("Exploring")).toBeTruthy();
    expect(screen.getByText("Plan Ready")).toBeTruthy();
    expect(screen.getByText("Promoted")).toBeTruthy();
    expect(screen.getByText("test-1")).toBeTruthy();
  });

  it("renders error state", () => {
    render(
      <PlanningDashboard
        planningSessions={[]}
        projectName="Test Project"
        projects={[]}
        dashboardLoadError="Something went wrong"
      />,
    );
    expect(screen.getByText(/Something went wrong/)).toBeTruthy();
  });
});
