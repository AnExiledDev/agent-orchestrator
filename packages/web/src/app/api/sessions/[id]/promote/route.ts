import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { getProjectSessionsDir, updateMetadata } from "@aoagents/ao-core";
import { getServices } from "@/lib/services";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { sessionManager } = await getServices();
    const session = await sessionManager.get(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.metadata["mode"] !== "planning") {
      return NextResponse.json({ error: "Not a planning session" }, { status: 400 });
    }

    if (session.metadata["promotedTo"]) {
      return NextResponse.json(
        { error: `Already promoted to ${session.metadata["promotedTo"]}` },
        { status: 409 },
      );
    }

    if (!session.workspacePath) {
      return NextResponse.json({ error: "No workspace path" }, { status: 400 });
    }

    let planContent: string;
    try {
      planContent = await readFile(join(session.workspacePath, ".ao", "plan.md"), "utf-8");
    } catch {
      return NextResponse.json({ error: "No plan found at .ao/plan.md" }, { status: 404 });
    }

    const prompt = [
      "# Implementation Plan",
      "",
      "The following plan was produced by a planning session. Implement it.",
      "",
      planContent,
    ].join("\n");

    const codingSession = await sessionManager.spawn({
      projectId: session.projectId,
      issueId: session.issueId ?? undefined,
      prompt,
      mode: "coding",
    });

    const sessionsDir = getProjectSessionsDir(session.projectId);
    updateMetadata(sessionsDir, id, { promotedTo: codingSession.id });
    updateMetadata(sessionsDir, codingSession.id, { promotedFrom: id });

    return NextResponse.json({
      promotedTo: codingSession.id,
      codingSessionId: codingSession.id,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
