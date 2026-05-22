import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest } from "next/server";
import { getServices } from "@/lib/services";
import { validateIdentifier } from "@/lib/validation";
import { SessionNotFoundError } from "@aoagents/ao-core";
import {
  getCorrelationId,
  jsonWithCorrelation,
  recordApiObservation,
  resolveProjectIdForSessionId,
} from "@/lib/observability";
import { detectImageFormat, getExtension, MAX_IMAGE_SIZE } from "@/lib/image-validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = getCorrelationId(request);
  const startedAt = Date.now();
  try {
    const { id } = await params;

    const idErr = validateIdentifier(id, "id");
    if (idErr) {
      return jsonWithCorrelation({ error: idErr }, { status: 400 }, correlationId);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonWithCorrelation(
        { error: "Invalid multipart/form-data request body" },
        { status: 400 },
        correlationId,
      );
    }

    const file = formData.get("image");
    if (!file || !(file instanceof File)) {
      return jsonWithCorrelation(
        { error: "Missing 'image' file field" },
        { status: 400 },
        correlationId,
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return jsonWithCorrelation(
        { error: `Image exceeds maximum size of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` },
        { status: 400 },
        correlationId,
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const format = detectImageFormat(buffer);
    if (!format) {
      return jsonWithCorrelation(
        { error: "Unsupported image format. Supported: JPEG, PNG, GIF, WebP" },
        { status: 400 },
        correlationId,
      );
    }

    const { config, sessionManager } = await getServices();
    const projectId = resolveProjectIdForSessionId(config, id);

    const session = await sessionManager.get(id);
    if (!session) {
      throw new SessionNotFoundError(id);
    }

    if (!session.workspacePath) {
      return jsonWithCorrelation(
        { error: "Session has no workspace path" },
        { status: 400 },
        correlationId,
      );
    }

    const ext = getExtension(format);
    const filename = `paste-${Date.now()}.${ext}`;
    const relativePath = `.ao/images/${filename}`;
    const imagesDir = join(session.workspacePath, ".ao", "images");

    await mkdir(imagesDir, { recursive: true });
    await writeFile(join(imagesDir, filename), buffer);

    recordApiObservation({
      config,
      method: "POST",
      path: "/api/sessions/[id]/image",
      correlationId,
      startedAt,
      outcome: "success",
      statusCode: 200,
      projectId,
      sessionId: id,
      data: { size: buffer.length, format },
    });

    return jsonWithCorrelation(
      { path: relativePath, size: buffer.length, format },
      { status: 200 },
      correlationId,
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const { config } = await getServices().catch(() => ({ config: undefined }));
    if (config) {
      recordApiObservation({
        config,
        method: "POST",
        path: "/api/sessions/[id]/image",
        correlationId,
        startedAt,
        outcome: "failure",
        statusCode: error instanceof SessionNotFoundError ? 404 : 500,
        reason: errorMsg,
      });
    }
    if (error instanceof SessionNotFoundError) {
      return jsonWithCorrelation({ error: errorMsg }, { status: 404 }, correlationId);
    }
    console.error("Failed to upload image:", errorMsg);
    return jsonWithCorrelation({ error: "Internal server error" }, { status: 500 }, correlationId);
  }
}
