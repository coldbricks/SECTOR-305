import { describe, expect, it } from "vitest";
import {
  baseUnitsA07,
  incidentRobberyBadAddress,
  incidentTheftReport,
} from "../src/fixtures.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime, replaySession } from "../src/runtime.js";
import type { PlayerCommand } from "../src/types.js";

describe("checkride goldens", () => {
  const pack = loadDefaultPack();

  it("FAIL: no verify + undercode + single unit + no weapons air + no readback", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "golden_fail",
      seed: 305,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.applyAll([
      { atMs: 1000, cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P4" } },
      {
        atMs: 2000,
        cmd: {
          type: "DispatchUnits",
          incidentId: "cfs-001",
          unitIds: ["u-3a12"],
          radioCaption: "3A12 handle the beach thing",
        },
      },
      { atMs: 50000, cmd: { type: "Advance", ms: 50000 } },
    ]);
    const d = rt.debrief();
    expect(d.passed).toBe(false);
    const codes = new Set(d.hardFails.map((f) => f.code));
    expect(codes.has("FAIL_PRIORITY_UNDERCODE")).toBe(true);
    expect(codes.has("FAIL_NO_VERIFY")).toBe(true);
    expect(codes.has("FAIL_NO_BACKUP")).toBe(true);
    expect(codes.has("FAIL_NO_READBACK")).toBe(true);
  });

  it("PASS: verify, reclass P1, backup, weapons aired, readbacks, clean close", () => {
    const commands: Array<{ atMs: number; cmd: PlayerCommand }> = [
      {
        atMs: 2000,
        cmd: {
          type: "VerifyLocation",
          incidentId: "cfs-001",
          confidence: "verified",
          location: {
            freeform: "1400 block Ocean Drive",
            block: "1400",
            street: "Ocean Drive",
            zoneId: "Z-OCEAN",
          },
        },
      },
      {
        atMs: 3000,
        cmd: {
          type: "SetNature",
          incidentId: "cfs-001",
          natureCode: "ROBBERY-IP",
          natureText: "Robbery in progress",
        },
      },
      { atMs: 3500, cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P1" } },
      { atMs: 4000, cmd: { type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true } },
      {
        atMs: 4100,
        cmd: { type: "SetFlag", incidentId: "cfs-001", flag: "NEEDS_BACKUP", value: true },
      },
      {
        atMs: 5000,
        cmd: {
          type: "DispatchUnits",
          incidentId: "cfs-001",
          unitIds: ["u-3a12", "u-3a14"],
          radioCaption:
            "3A12, 3A14, P1 robbery in progress, 1400 block Ocean Drive, weapon reported",
        },
      },
      {
        atMs: 8000,
        cmd: {
          type: "UnitRadioRx",
          unitId: "u-3a12",
          incidentId: "cfs-001",
          caption: "3A12 copy, en route",
          kind: "ACK",
        },
      },
      {
        atMs: 9000,
        cmd: {
          type: "UnitRadioRx",
          unitId: "u-3a14",
          incidentId: "cfs-001",
          caption: "3A14 en route",
          kind: "ACK",
        },
      },
      {
        atMs: 20000,
        cmd: {
          type: "UnitRadioRx",
          unitId: "u-3a12",
          incidentId: "cfs-001",
          caption: "3A12 on scene",
          kind: "STATUS",
        },
      },
      {
        atMs: 21000,
        cmd: {
          type: "UnitRadioRx",
          unitId: "u-3a14",
          incidentId: "cfs-001",
          caption: "3A14 on scene",
          kind: "STATUS",
        },
      },
      { atMs: 40000, cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "CLR" } },
      { atMs: 40100, cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "AVL" } },
      { atMs: 40200, cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "CLR" } },
      { atMs: 40300, cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "AVL" } },
      {
        atMs: 41000,
        cmd: { type: "ClearIncident", incidentId: "cfs-001", disposition: "GOA" },
      },
    ];

    const rt = new Runtime({
      pack,
      scenarioId: "golden_pass",
      seed: 305,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.applyAll(commands);
    const d = rt.debrief();
    expect(d.hardFails).toEqual([]);
    expect(d.passed).toBe(true);

    // Deterministic replay
    const record = rt.toSessionRecord(commands);
    const { debrief: d2 } = replaySession(
      pack,
      baseUnitsA07(),
      [incidentRobberyBadAddress()],
      record
    );
    expect(d2.passed).toBe(true);
    expect(d2.hardFails.map((h) => h.code)).toEqual(d.hardFails.map((h) => h.code));
  });

  it("FAIL: concurrency — P1 ages while player only works P4 cosmetics", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "aging",
      seed: 7,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress(), incidentTheftReport()],
    });
    // Fix robbery to P1 verified but never dispatch; mess with theft
    rt.applyAll([
      {
        atMs: 1000,
        cmd: {
          type: "VerifyLocation",
          incidentId: "cfs-001",
          confidence: "verified",
          location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
        },
      },
      { atMs: 1500, cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P1" } },
      {
        atMs: 2000,
        cmd: {
          type: "AddNote",
          incidentId: "cfs-002",
          text: "Caller wants case number eventually",
        },
      },
      { atMs: 70000, cmd: { type: "Advance", ms: 70000 } },
    ]);
    const d = rt.debrief();
    expect(d.hardFails.some((f) => f.code === "FAIL_PRIORITY_AGING")).toBe(true);
  });
});
