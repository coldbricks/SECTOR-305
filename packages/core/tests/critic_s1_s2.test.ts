/**
 * External critic S1-TRUTHLEAK, S2-SAFETYHATCH, S3 fixtures + mutation evidence.
 */
import { describe, expect, it } from "vitest";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";
import { baseUnitsA07, incidentRobberyBadAddress } from "../src/fixtures.js";

describe("S1-TRUTHLEAK: dispatch grades only through knowable gate", () => {
  const pack = loadDefaultPack();

  it("(a) pre-cue dispatch at presented P3 → no hard undercode/verify from hidden truth", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "pre_cue",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    // t=0: schedule not fired; dispatch as presented disturbance P3 with verify partial...
    // Without verify, still shouldn't get FAIL from truth-P1 if not knowable
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P3 disturbance, neon club beach",
    });
    const codes = rt.state.gradeLog.filter((g) => g.severity === "hard_fail").map((g) => g.code);
    expect(codes).not.toContain("FAIL_PRIORITY_UNDERCODE");
    // verify gate also must not use hidden P1
    expect(codes).not.toContain("FAIL_NO_VERIFY");
  });

  it("(b) post-cue same undercode dispatch → FAIL_PRIORITY_UNDERCODE", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "post_cue",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12"],
      radioCaption: "3A12, P3 disturbance, beach",
    });
    expect(
      rt.state.gradeLog.some((g) => g.code === "FAIL_PRIORITY_UNDERCODE")
    ).toBe(true);
  });
});

describe("S2-SAFETYHATCH: effective caption always graded", () => {
  const pack = loadDefaultPack();

  it("weapons knowable + explicit caption without weapons → FAIL_SAFETY_NOT_AIRED", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "safety_caption",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: {
        freeform: "1400 block Ocean Drive",
        zoneId: "Z-OCEAN",
      },
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean",
    });
    expect(rt.state.gradeLog.some((g) => g.code === "FAIL_SAFETY_NOT_AIRED")).toBe(true);
  });

  it("weapons knowable + omitted radioCaption → auto-caption includes weapon (not silent skip)", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "safety_auto",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      // no radioCaption
    });
    const last = rt.state.radioLog[rt.state.radioLog.length - 1];
    expect(last?.caption.toLowerCase()).toMatch(/weapon/);
    expect(rt.state.gradeLog.some((g) => g.code === "FAIL_SAFETY_NOT_AIRED")).toBe(false);
  });
});

describe("S3-1 status laundering soft mark", () => {
  it("DIS → on scene phrase yields SOFT_STATUS_QUERY_LATE", () => {
    const pack = loadDefaultPack();
    const rt = new Runtime({
      pack,
      scenarioId: "launder",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon reported",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      incidentId: "cfs-001",
      caption: "3A12 on scene",
      kind: "STATUS",
    });
    expect(
      rt.state.gradeLog.some((g) => g.code === "SOFT_STATUS_QUERY_LATE")
    ).toBe(true);
  });
});

describe("S3-3 instance idSeq no interleave", () => {
  it("two sequential runtimes produce same first grade ids", () => {
    const pack = loadDefaultPack();
    const run = () => {
      const rt = new Runtime({
        pack,
        scenarioId: "id",
        seed: 1,
        units: baseUnitsA07(),
        incidents: [incidentRobberyBadAddress()],
      });
      rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P4" });
      return rt.state.gradeLog.map((g) => g.id);
    };
    expect(run()).toEqual(run());
  });

  it("interleaved runtimes do not cross-contaminate id sequences", () => {
    const pack = loadDefaultPack();
    const a = new Runtime({
      pack,
      scenarioId: "a",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    const b = new Runtime({
      pack,
      scenarioId: "b",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    a.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P4" });
    b.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P4" });
    a.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P5" });
    // Instance idSeq: sim event consumes first slot (ev_1), first grade is gr_2.
    // Module-global would make b's first grade gr_4+ after a advanced the shared counter.
    expect(a.state.gradeLog[0]?.id).toBe("gr_2");
    expect(b.state.gradeLog[0]?.id).toBe("gr_2");
    expect(a.state.gradeLog[1]?.id).toBe("gr_4");
    expect(b.state.gradeLog).toHaveLength(1);
  });
});

describe("S3-2 force-clear house law", () => {
  it("clear with dirty unit grades dirty-close then force AVL", () => {
    const pack = loadDefaultPack();
    const rt = new Runtime({
      pack,
      scenarioId: "force_clear",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon",
    });
    // Leave units DIS/ER — dirty
    rt.apply({ type: "ClearIncident", incidentId: "cfs-001", disposition: "GOA" });
    expect(rt.state.gradeLog.some((g) => g.code === "FAIL_STATUS_DIRTY_CLOSE")).toBe(
      true
    );
    expect(rt.state.units["u-3a12"]!.status).toBe("AVL");
    expect(rt.state.units["u-3a14"]!.status).toBe("AVL");
    expect(
      rt.state.incidents["cfs-001"]!.notes.some((n) =>
        n.text.includes("force-clear")
      )
    ).toBe(true);
  });
});
