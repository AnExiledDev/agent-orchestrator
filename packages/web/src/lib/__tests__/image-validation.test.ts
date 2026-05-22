import { describe, expect, it } from "vitest";
import { detectImageFormat, getExtension, MAX_IMAGE_SIZE } from "@/lib/image-validation";

describe("detectImageFormat", () => {
  it("detects JPEG", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageFormat(buf)).toBe("jpeg");
  });

  it("detects PNG", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectImageFormat(buf)).toBe("png");
  });

  it("detects GIF87a", () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
    expect(detectImageFormat(buf)).toBe("gif");
  });

  it("detects GIF89a", () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectImageFormat(buf)).toBe("gif");
  });

  it("detects WebP", () => {
    // RIFF....WEBP
    const buf = Buffer.alloc(12);
    buf.writeUInt32BE(0x52494646, 0); // RIFF
    buf.writeUInt32LE(1000, 4); // file size (arbitrary)
    buf.writeUInt32BE(0x57454250, 8); // WEBP
    expect(detectImageFormat(buf)).toBe("webp");
  });

  it("returns null for unknown format", () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    expect(detectImageFormat(buf)).toBeNull();
  });

  it("returns null for empty buffer", () => {
    expect(detectImageFormat(Buffer.alloc(0))).toBeNull();
  });

  it("returns null for truncated JPEG (too short)", () => {
    const buf = Buffer.from([0xff, 0xd8]);
    expect(detectImageFormat(buf)).toBeNull();
  });

  it("returns null for truncated PNG (too short)", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(detectImageFormat(buf)).toBeNull();
  });

  it("returns null for truncated WebP (missing WEBP at offset 8)", () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
    expect(detectImageFormat(buf)).toBeNull();
  });

  it("returns null for RIFF with non-WEBP subtype", () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt32BE(0x52494646, 0); // RIFF
    buf.writeUInt32LE(1000, 4);
    buf.writeUInt32BE(0x41564920, 8); // AVI
    expect(detectImageFormat(buf)).toBeNull();
  });
});

describe("getExtension", () => {
  it("returns jpg for jpeg", () => {
    expect(getExtension("jpeg")).toBe("jpg");
  });

  it("returns png for png", () => {
    expect(getExtension("png")).toBe("png");
  });

  it("returns gif for gif", () => {
    expect(getExtension("gif")).toBe("gif");
  });

  it("returns webp for webp", () => {
    expect(getExtension("webp")).toBe("webp");
  });
});

describe("MAX_IMAGE_SIZE", () => {
  it("is 5MB", () => {
    expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
  });
});
