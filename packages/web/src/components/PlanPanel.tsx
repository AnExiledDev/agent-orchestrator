"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardSession } from "@/lib/types";

interface PlanPanelProps {
  session: DashboardSession;
}

export function PlanPanel({ session }: PlanPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const promotedTo = session.metadata["promotedTo"];

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(session.id)}/plan`);
      if (!res.ok) {
        setContent(null);
        return;
      }
      const data = (await res.json()) as { content: string | null };
      setContent(data.content);
    } catch {
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const handlePromote = async () => {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(session.id)}/promote`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(body.error ?? "Promote failed");
        return;
      }
      window.location.reload();
    } catch {
      alert("Promote failed");
    }
  };

  if (loading) {
    return (
      <div className="plan-panel">
        <div className="plan-panel__header">
          <h3 className="plan-panel__title">Implementation Plan</h3>
        </div>
        <div className="plan-panel__body plan-panel__body--loading">Loading plan...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="plan-panel">
        <div className="plan-panel__header">
          <h3 className="plan-panel__title">Implementation Plan</h3>
        </div>
        <div className="plan-panel__body plan-panel__body--empty">
          No plan written yet. The agent will create <code>.ao/plan.md</code> when ready.
        </div>
      </div>
    );
  }

  return (
    <div className="plan-panel" data-expanded={expanded}>
      <div className="plan-panel__header">
        <h3 className="plan-panel__title">Implementation Plan</h3>
        <div className="plan-panel__actions">
          <button
            type="button"
            className="plan-panel__toggle"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          {!promotedTo ? (
            <button
              type="button"
              className="plan-panel__promote-btn"
              onClick={() => void handlePromote()}
            >
              Promote to Implementation
            </button>
          ) : (
            <span className="plan-panel__promoted-label">
              Promoted to {promotedTo}
            </span>
          )}
        </div>
      </div>
      <div className="plan-panel__body">
        <pre className="plan-panel__content">{content}</pre>
      </div>
    </div>
  );
}
