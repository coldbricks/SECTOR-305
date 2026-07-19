import { describe, expect, it } from "vitest";
import {
  createMasteryProfile,
  recordMasteryWatch,
  type Debrief,
  type GradeEvent,
} from "../src/index.js";

function finding(
  code: GradeEvent["code"],
  severity: GradeEvent["severity"],
  atMs = 27_000
): GradeEvent {
  return {
    id: `${code}-${atMs}`,
    atMs,
    severity,
    code,
    rubricId: `TEST_${code}`,
    message: `Observed ${code}`,
    evidence: { ruleRef: "test.mastery" },
  };
}

function debrief(findings: GradeEvent[] = []): Debrief {
  const hardFails = findings.filter((item) => item.severity === "hard_fail");
  const softMarks = findings.filter((item) => item.severity === "soft");
  return {
    scenarioId: "mastery-test",
    seed: 305,
    clockMs: 80_000,
    passed: hardFails.length === 0,
    hardFails,
    softMarks,
    notes: [],
    timeline: [],
    metrics: { incidentsTotal: 2, incidentsCleared: 1, dispatches: 1, radioTx: 1 },
    disclaimer: "Training only.",
  };
}

describe("adaptive mastery profile", () => {
  it("starts with a doctrine-neutral baseline watch", () => {
    const profile = createMasteryProfile();

    expect(profile.watchesCompleted).toBe(0);
    expect(profile.focus.mode).toBe("baseline");
    expect(profile.focus.title).toBe("Establish the baseline");
  });

  it("turns a location hard fail into the next-watch objective", () => {
    const profile = recordMasteryWatch(
      createMasteryProfile(),
      debrief([finding("FAIL_NO_VERIFY", "hard_fail")]),
      "watch-1",
      "2026-07-19T06:30:00.000Z"
    );

    expect(profile.watchesCompleted).toBe(1);
    expect(profile.domains.LOC.hardFindings).toBe(1);
    expect(profile.focus).toMatchObject({
      mode: "correction",
      domain: "LOC",
      label: "LOCATION",
      title: "Verify before you launch",
      sourceCode: "FAIL_NO_VERIFY",
    });
  });

  it("is idempotent for the same completed watch", () => {
    const once = recordMasteryWatch(
      createMasteryProfile(),
      debrief([finding("FAIL_NO_READBACK", "hard_fail")]),
      "same-watch",
      "2026-07-19T06:31:00.000Z"
    );
    const twice = recordMasteryWatch(
      once,
      debrief([finding("FAIL_NO_READBACK", "hard_fail")]),
      "same-watch",
      "2026-07-19T06:31:00.000Z"
    );

    expect(twice).toEqual(once);
  });

  it("keeps the strongest recurring weakness as a retention objective after a clean watch", () => {
    let profile = createMasteryProfile();
    profile = recordMasteryWatch(
      profile,
      debrief([finding("FAIL_NO_VERIFY", "hard_fail")]),
      "watch-loc",
      "2026-07-19T06:32:00.000Z"
    );
    profile = recordMasteryWatch(
      profile,
      debrief([
        finding("FAIL_NO_READBACK", "hard_fail"),
        finding("SOFT_RADIO_WORDY", "soft", 28_000),
      ]),
      "watch-radio-1",
      "2026-07-19T06:33:00.000Z"
    );
    profile = recordMasteryWatch(
      profile,
      debrief([finding("FAIL_RADIO_FORMAT", "hard_fail")]),
      "watch-radio-2",
      "2026-07-19T06:34:00.000Z"
    );
    profile = recordMasteryWatch(
      profile,
      debrief(),
      "watch-clean",
      "2026-07-19T06:35:00.000Z"
    );

    expect(profile.watchesCompleted).toBe(4);
    expect(profile.cleanWatches).toBe(1);
    expect(profile.focus).toMatchObject({
      mode: "retention",
      domain: "RAD",
      title: "Prove the radio discipline holds",
    });
  });
});
