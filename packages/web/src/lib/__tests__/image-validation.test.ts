import { describe, it, expect } from "vitest";
import { detectImageFormat, getExtension, MAX_IMAGE_SIZE } from "../image-validation";
import type { ImageFormat } from "../image-validation";

describe("detectImageFormat", () => {
  it("detects JPEG from magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageFormat(buf)).toBe("jpeg");
  });

  it("detects PNG from magic bytes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectImageFormat(buf)).toBe("png");
  });

  it("detects GIF from magic bytes", () => {
    // GIF89a
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectImageFormat(buf)).toBe("gif");
  });

  it("detects GIF87a variant", () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
    expect(detectImageFormat(buf)).toBe("gif");
  });

  it("detects WebP from magic bytes", () => {
    // RIFF....WEBP
    const buf = Buffer.alloc(12);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(0, 4); // file size placeholder
    buf.write("WEBP", 8);
    expect(detectImageFormat(buf)).toBe("webp");
  });

  it("returns null for unknown format", () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    expect(detectImageFormat(buf)).toBeNull();
  });

  it("returns null for empty buffer", () => {
    expect(detectImageFormat(Buffer.alloc(0))).toBeNull();
  });

  it("returns null for buffer too short for any format", () => {
    expect(detectImageFormat(Buffer.from([0xff, 0xd8]))).toBeNull();
  });

  it("returns null for truncated PNG header", () => {
    // Only 4 of the 8 PNG magic bytes
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(detectImageFormat(buf)).toBeNull();
  });

  it("returns null for truncated WebP header", () => {
    // Only RIFF prefix, missing WEBP at offset 8
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
    expect(detectImageFormat(buf)).toBeNull();
  });
});

describe("getExtension", () => {
  it("maps jpeg to jpg", () => {
    expect(getExtension("jpeg")).toBe("jpg");
  });

  it("maps png to png", () => {
    expect(getExtension("png")).toBe("png");
  });

  it("maps gif to gif", () => {
    expect(getExtension("gif")).toBe("gif");
  });

  it("maps webp to webp", () => {
    expect(getExtension("webp")).toBe("webp");
  });

  it("covers all ImageFormat values", () => {
    const formats: ImageFormat[] = ["jpeg", "png", "gif", "webp"];
    for (const fmt of formats) {
      expect(typeof getExtension(fmt)).toBe("string");
    }
  });
});

describe("MAX_IMAGE_SIZE", () => {
  it("equals 5 MB", () => {
    expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
  });
});
