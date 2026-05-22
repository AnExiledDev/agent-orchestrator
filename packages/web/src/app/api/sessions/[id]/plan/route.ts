import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { getServices } from "@/lib/services";

export async function GET(
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

    if (!session.workspacePath) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    const planPath = join(session.workspacePath, ".ao", "plan.md");
    const content = await readFile(planPath, "utf-8");
    return NextResponse.json({ content });
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return NextResponse.json({ content: null });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
