import { describe, expect, it } from "vitest";
import {
  buildStatusMatrix,
  canTransitionStatus,
  illegalCount,
  legalCount,
  UNIT_STATUSES,
  LEGAL_NEXT,
} from "../src/doctrine/statusMatrix.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";
import { baseUnitsA07 } from "../src/fixtures.js";

describe("M01b unit status 64-cell matrix", () => {
  const matrix = buildStatusMatrix();

  it("has exactly 64 cells", () => {
    expect(matrix.length).toBe(64);
    expect(UNIT_STATUSES.length).toBe(8);
  });

  it("enumerates every from×to pair once", () => {
    const keys = new Set(matrix.map((c) => `${c.from}->${c.to}`));
    expect(keys.size).toBe(64);
  });

  it("legal + illegal counts sum to 64", () => {
    expect(legalCount() + illegalCount()).toBe(64);
    expect(legalCount()).toBeGreaterThan(20);
    expect(illegalCount()).toBeGreaterThan(20);
  });

  it("every matrix legal cell matches LEGAL_NEXT", () => {
    for (const cell of matrix) {
      const expected =
        cell.from !== cell.to && LEGAL_NEXT[cell.from].includes(cell.to);
      expect(cell.legal).toBe(expected);
    }
  });

  it("pack unitStatuses next arrays align with LEGAL_NEXT", () => {
    const pack = loadDefaultPack();
    for (const row of pack.unitStatuses) {
      expect(row.next.sort()).toEqual([...LEGAL_NEXT[row.code]].sort());
    }
  });

  it.each(
    matrix.filter((c) => !c.legal && c.from !== c.to).map((c) => [c.from, c.to] as const)
  )("runtime blocks illegal %s → %s", (from, to) => {
    const pack = loadDefaultPack();
    const units = baseUnitsA07();
    // force unit into `from` via legal path when possible
    const rt = new Runtime({ pack, scenarioId: "m", seed: 1, units });
    const u = rt.state.units["u-3a12"]!;
    // brute: set status field only for test setup of intermediate states
    if (from !== "AVL") {
      u.status = from;
      u.statusChangedAtMs = 0;
      if (from === "DIS" || from === "ER" || from === "OS") {
        u.assignedIncidentId = "x";
      }
    }
    rt.apply({ type: "SetUnitStatus", unitId: "u-3a12", status: to });
    if (!canTransitionStatus(from, to)) {
      expect(rt.state.units["u-3a12"]!.status).toBe(from);
      expect(rt.state.gradeLog.some((g) => g.code === "FAIL_STATUS_ILLEGAL")).toBe(true);
    }
  });

  it("allows full happy path AVL→DIS→ER→OS→CLR→AVL via runtime", () => {
    const pack = loadDefaultPack();
    const rt = new Runtime({
      pack,
      scenarioId: "happy",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [],
    });
    // create minimal incident for assignment
    rt.apply({
      type: "InjectIncident",
      incident: {
        id: "c1",
        cfsNumber: "1",
        priority: "P4",
        natureCode: "THEFT-REPORT",
        natureText: "theft",
        location: { freeform: "200 Collins", zoneId: "Z-COLLINS" },
        locationConfidence: "verified",
        jurisdictionId: "CITY-BEACH",
        createdAtMs: 0,
        receivedAtMs: 0,
        enteredAtMs: 0,
        callerLanguage: "en",
        flags: [],
        truth: {
          actualLocation: { freeform: "200 Collins", zoneId: "Z-COLLINS" },
          actualPriority: "P4",
          actualNature: "THEFT-REPORT",
          weapons: false,
          inProgress: false,
          requiresBackup: false,
          callerLanguage: "en",
        },
      },
    });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "c1",
      unitIds: ["u-3a12"],
      radioCaption: "3A12, P4 theft report, 200 Collins",
    });
    expect(rt.state.units["u-3a12"]!.status).toBe("DIS");
    rt.apply({ type: "SetUnitStatus", unitId: "u-3a12", status: "ER" });
    rt.apply({ type: "SetUnitStatus", unitId: "u-3a12", status: "OS" });
    rt.apply({ type: "SetUnitStatus", unitId: "u-3a12", status: "CLR" });
    rt.apply({ type: "SetUnitStatus", unitId: "u-3a12", status: "AVL" });
    expect(rt.state.units["u-3a12"]!.status).toBe("AVL");
    expect(rt.state.gradeLog.filter((g) => g.code === "FAIL_STATUS_ILLEGAL")).toHaveLength(0);
  });
});
