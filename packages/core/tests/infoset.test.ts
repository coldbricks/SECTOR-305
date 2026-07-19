import { describe, expect, it } from "vitest";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";
import { baseUnitsA07, incidentRobberyBadAddress } from "../src/fixtures.js";

describe("M11 information-set knowable schedule (C10)", () => {
  const pack = loadDefaultPack();

  it("does not hard-fail undercode before weapons cue is knowable", () => {
    const inc = incidentRobberyBadAddress();
    inc.truth.knowableSchedule = [
      {
        atMs: 60000,
        facet: "weapons",
        summary: "Caller now says knife — possible robbery",
      },
      {
        atMs: 90000,
        facet: "nature",
        summary: "Sounds like bag was taken — robbery in progress",
      },
    ];
    // Remove immediate knowable flags
    inc.flags = [];

    const rt = new Runtime({
      pack,
      scenarioId: "infoset_c10",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [inc],
    });

    // At t=0 schedule not fired — undercode should be soft not hard
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P4" });
    const softOnly = rt.state.gradeLog.filter((g) => g.code === "FAIL_PRIORITY_UNDERCODE");
    expect(softOnly.length).toBe(0);

    // After weapons cue becomes knowable, undercode hard-fails
    rt.apply({ type: "Advance", ms: 61000 });
    expect(rt.state.incidents["cfs-001"]!.flags.includes("WEAPONS")).toBe(true);
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P4" });
    // already P4 — set to P3 then P4 again or set P5
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P5" });
    expect(
      rt.state.gradeLog.some((g) => g.code === "FAIL_PRIORITY_UNDERCODE")
    ).toBe(true);
  });

  it("legacy empty schedule still hard-fails undercode (authoring convenience)", () => {
    const inc = incidentRobberyBadAddress();
    delete inc.truth.knowableSchedule;
    const rt = new Runtime({
      pack,
      scenarioId: "infoset_legacy",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [inc],
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P4" });
    expect(
      rt.state.gradeLog.some((g) => g.code === "FAIL_PRIORITY_UNDERCODE")
    ).toBe(true);
  });
});
