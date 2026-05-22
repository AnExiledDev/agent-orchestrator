export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export type ImageFormat = "jpeg" | "png" | "gif" | "webp";

const SIGNATURES: ReadonlyArray<{
  format: ImageFormat;
  bytes: readonly number[];
  offset: number;
  extra?: { bytes: readonly number[]; offset: number };
}> = [
  { format: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  { format: "jpeg", bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { format: "gif", bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
  {
    format: "webp",
    bytes: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    extra: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  },
];

export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  for (const sig of SIGNATURES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;
    if (sig.extra && buffer.length < sig.extra.offset + sig.extra.bytes.length) continue;

    const primaryMatch = sig.bytes.every((b, i) => buffer[sig.offset + i] === b);
    if (!primaryMatch) continue;

    if (sig.extra) {
      const { bytes: extraBytes, offset: extraOffset } = sig.extra;
      const extraMatch = extraBytes.every((b, i) => buffer[extraOffset + i] === b);
      if (!extraMatch) continue;
    }

    return sig.format;
  }
  return null;
}

const EXTENSION_MAP: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  gif: "gif",
  webp: "webp",
};

export function getExtension(format: ImageFormat): string {
  return EXTENSION_MAP[format];
}
