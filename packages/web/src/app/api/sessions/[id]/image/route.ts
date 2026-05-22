import { type NextRequest } from "next/server";
import { getServices } from "@/lib/services";
import { validateIdentifier } from "@/lib/validation";
import { detectImageFormat, getExtension, MAX_IMAGE_SIZE } from "@/lib/image-validation";
import {
  getCorrelationId,
  jsonWithCorrelation,
  recordApiObservation,
  resolveProjectIdForSessionId,
} from "@/lib/observability";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = getCorrelationId(request);
  const startedAt = Date.now();
  try {
    const { id } = await params;

    // Validate session ID to prevent injection
    const idErr = validateIdentifier(id, "id");
    if (idErr) {
      return jsonWithCorrelation({ error: idErr }, { status: 400 }, correlationId);
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonWithCorrelation(
        { error: "Invalid multipart form data" },
        { status: 400 },
        correlationId,
      );
    }

    const file = formData.get("image");
    if (!file || !(file instanceof Blob)) {
      return jsonWithCorrelation(
        { error: "image field is required and must be a file" },
        { status: 400 },
        correlationId,
      );
    }

    // Validate size
    if (file.size > MAX_IMAGE_SIZE) {
      return jsonWithCorrelation(
        { error: `Image exceeds maximum size of ${MAX_IMAGE_SIZE} bytes (5MB)` },
        { status: 400 },
        correlationId,
      );
    }

    if (file.size === 0) {
      return jsonWithCorrelation(
        { error: "Image file is empty" },
        { status: 400 },
        correlationId,
      );
    }

    // Read file bytes and validate magic bytes
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

    // Look up session
    const { config, sessionManager } = await getServices();
    const projectId = resolveProjectIdForSessionId(config, id);
    const session = await sessionManager.get(id);

    if (!session) {
      recordApiObservation({
        config,
        method: "POST",
        path: "/api/sessions/[id]/image",
        correlationId,
        startedAt,
        outcome: "failure",
        statusCode: 404,
        projectId,
        sessionId: id,
        reason: "Session not found",
      });
      return jsonWithCorrelation(
        { error: "Session not found" },
        { status: 404 },
        correlationId,
      );
    }

    if (!session.workspacePath) {
      recordApiObservation({
        config,
        method: "POST",
        path: "/api/sessions/[id]/image",
        correlationId,
        startedAt,
        outcome: "failure",
        statusCode: 400,
        projectId,
        sessionId: id,
        reason: "Session has no workspace path",
      });
      return jsonWithCorrelation(
        { error: "Session has no workspace path" },
        { status: 400 },
        correlationId,
      );
    }

    // Save image to workspace
    const ext = getExtension(format);
    const filename = `paste-${Date.now()}.${ext}`;
    const relativePath = `.ao/images/${filename}`;
    const imagesDir = path.join(session.workspacePath, ".ao", "images");
    const fullPath = path.join(imagesDir, filename);

    await fs.mkdir(imagesDir, { recursive: true });
    await fs.writeFile(fullPath, buffer);

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
      data: { format, size: buffer.length, filename },
    });

    return jsonWithCorrelation(
      { path: relativePath, size: buffer.length, format },
      { status: 200 },
      correlationId,
    );
  } catch (error) {
    console.error("Failed to upload image:", error);
    const { config } = await getServices().catch(() => ({ config: undefined }));
    if (config) {
      recordApiObservation({
        config,
        method: "POST",
        path: "/api/sessions/[id]/image",
        correlationId,
        startedAt,
        outcome: "failure",
        statusCode: 500,
        reason: error instanceof Error ? error.message : "Internal server error",
      });
    }
    return jsonWithCorrelation({ error: "Internal server error" }, { status: 500 }, correlationId);
  }
}
