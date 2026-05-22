import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PlanPanel } from "../PlanPanel";
import type { DashboardSession } from "@/lib/types";

function makeSession(overrides: Partial<DashboardSession> = {}): DashboardSession {
  return {
    id: "plan-1",
    projectId: "proj",
    status: "working" as any,
    activity: "active",
    branch: "session/plan-1",
    issueId: null,
    issueUrl: null,
    issueLabel: null,
    issueTitle: null,
    userPrompt: null,
    displayName: null,
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

describe("PlanPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows loading state initially", () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}),
    );
    render(<PlanPanel session={makeSession()} />);
    expect(screen.getByText("Loading plan...")).toBeTruthy();
  });

  it("shows empty state when no plan exists", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: null }),
    });
    render(<PlanPanel session={makeSession()} />);
    await waitFor(() => {
      expect(screen.getByText(/No plan written yet/)).toBeTruthy();
    });
  });

  it("renders plan content when available", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: "# My Plan\n\nStep 1: Research" }),
    });
    render(<PlanPanel session={makeSession()} />);
    await waitFor(() => {
      expect(screen.getByText(/My Plan/)).toBeTruthy();
    });
  });

  it("shows promote button when not yet promoted", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: "# Plan" }),
    });
    render(<PlanPanel session={makeSession()} />);
    await waitFor(() => {
      expect(screen.getByText("Promote to Implementation")).toBeTruthy();
    });
  });

  it("shows promoted label when already promoted", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: "# Plan" }),
    });
    render(
      <PlanPanel
        session={makeSession({ metadata: { mode: "planning", promotedTo: "coding-1" } })}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Promoted to coding-1/)).toBeTruthy();
    });
  });
});
