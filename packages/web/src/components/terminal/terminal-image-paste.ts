/**
 * Upload a pasted/dropped image to the server and inject a reference tag
 * into the terminal input via the mux writeTerminal path.
 */
export async function uploadImageAndInject(
  file: File | Blob,
  sessionId: string,
  projectId: string | undefined,
  writeTerminal: (id: string, data: string, projectId?: string) => void,
  showToast: (message: string, variant?: "success" | "error" | "info") => void,
): Promise<void> {
  showToast("Uploading image...", "info");

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      const message = body?.error ?? `Upload failed (${response.status})`;
      showToast(message, "error");
      return;
    }

    const result = (await response.json()) as { path: string; size: number; format: string };
    writeTerminal(sessionId, `[See Image: ${result.path}]`, projectId);
    showToast("Image attached", "success");
  } catch {
    showToast("Failed to upload image", "error");
  }
}
