import { describe, expect, it } from "vitest";
import {
  scoreSoftBand,
  weightOfSoftCode,
  DEFAULT_SOFT_BAND_CEILING,
} from "../src/grade/softBand.js";
import type { GradeEvent } from "../src/types.js";

function soft(code: string, i: number): GradeEvent {
  return {
    id: `g-${i}`,
    atMs: i * 1000,
    severity: "soft",
    code: code as GradeEvent["code"],
    rubricId: code,
    message: code,
    evidence: { expected: "x", actual: "y", ruleRef: "test" },
  };
}

describe("soft-band scoring", () => {
  it("clean when no soft marks", () => {
    const s = scoreSoftBand([]);
    expect(s.band).toBe("clean");
    expect(s.weight).toBe(0);
    expect(s.label).toBe("CLEAN COACHING");
  });

  it("coaching under ceiling", () => {
    const s = scoreSoftBand([soft("SOFT_RADIO_FORMAT", 1), soft("SOFT_NOTE_THIN", 2)]);
    expect(s.weight).toBe(weightOfSoftCode("SOFT_RADIO_FORMAT") + weightOfSoftCode("SOFT_NOTE_THIN"));
    expect(s.weight).toBeLessThanOrEqual(DEFAULT_SOFT_BAND_CEILING);
    expect(s.band).toBe("coaching");
  });

  it("heavy when weight exceeds ceiling", () => {
    const marks = Array.from({ length: 8 }, (_, i) => soft("SOFT_CONCURRENCY_TUNNEL", i));
    const s = scoreSoftBand(marks, 12);
    expect(s.weight).toBeGreaterThan(12);
    expect(s.band).toBe("heavy");
  });
});
