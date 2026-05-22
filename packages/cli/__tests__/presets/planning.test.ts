import { describe, it, expect } from "vitest";
import { resolvePreset } from "../../src/presets/index.js";
import { planningPreset } from "../../src/presets/planning.js";

describe("planning preset", () => {
  it("is resolvable by name", () => {
    const preset = resolvePreset("planning");
    expect(preset).toBe(planningPreset);
    expect(preset.name).toBe("planning");
  });

  it("has required fields", () => {
    expect(planningPreset.name).toBe("planning");
    expect(planningPreset.description).toBeTruthy();
    expect(planningPreset.prompt).toBeTruthy();
  });

  it("accepts an optional issue argument", () => {
    expect(planningPreset.issueArg).toBe("optional");
  });

  it("prompt contains key planning instructions", () => {
    const { prompt } = planningPreset;
    expect(prompt).toContain("Planning Analyst");
    expect(prompt).toContain(".ao/plan.md");
    expect(prompt).toContain("ao report research_complete");
    expect(prompt).toContain("Do NOT create branches");
    expect(prompt).toContain("Do NOT modify source code");
  });

  it("prompt is multi-line markdown", () => {
    expect(planningPreset.prompt).toContain("\n");
    expect(planningPreset.prompt.split("\n").length).toBeGreaterThan(10);
  });

  it("includes the error message list when unknown preset is requested", () => {
    expect(() => resolvePreset("nope")).toThrow(/planning/);
  });
});
