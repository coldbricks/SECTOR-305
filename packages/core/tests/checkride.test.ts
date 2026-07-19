import { describe, expect, it } from "vitest";
import {
  baseUnitsA07,
  incidentRobberyBadAddress,
} from "../src/fixtures.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime, replaySession } from "../src/runtime.js";
import { failCommands, passCommands } from "./checkride_sessions.js";
import type { PlayerCommand } from "../src/types.js";
import { ENGINE_VERSION } from "../src/schema/common.js";

const WEAPONS_CUE_MS = 15000;

describe("checkride goldens (fair timeline)", () => {
  const pack = loadDefaultPack();

  it("FAIL post-cue: undercode + no verify + single unit + no weapons air + no readback", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "golden_fail",
      seed: 305001,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.applyAll(failCommands());
    const d = rt.debrief();
    expect(d.passed).toBe(false);
    const codes = new Set(d.hardFails.map((f) => f.code));
    expect(codes.has("FAIL_PRIORITY_UNDERCODE")).toBe(true);
    expect(codes.has("FAIL_NO_VERIFY")).toBe(true);
    expect(codes.has("FAIL_NO_BACKUP")).toBe(true);
    expect(codes.has("FAIL_NO_READBACK")).toBe(true);
    expect(codes.has("FAIL_SAFETY_NOT_AIRED")).toBe(true);
    // Post-cue only — grades fire at dispatch clock (≥ weapons cue)
    for (const g of d.hardFails.filter((h) =>
      [
        "FAIL_PRIORITY_UNDERCODE",
        "FAIL_NO_VERIFY",
        "FAIL_NO_BACKUP",
        "FAIL_SAFETY_NOT_AIRED",
      ].includes(h.code)
    )) {
      expect(g.atMs).toBeGreaterThanOrEqual(WEAPONS_CUE_MS);
      // Dispatch step is authored @27000; applyAll lands there without double Advance
      expect(g.atMs).toBeGreaterThanOrEqual(27000);
    }
  });

  it("PASS: post-cue verify, reclass P1, backup, weapons aired, readbacks, clean close", () => {
    const commands = passCommands();
    // Static fairness: no truth-derived cmd before cues
    for (const step of commands) {
      if (step.cmd.type === "VerifyLocation") {
        expect(step.atMs).toBeGreaterThanOrEqual(25000);
      }
      if (step.cmd.type === "SetPriority" && step.cmd.priority === "P1") {
        expect(step.atMs).toBeGreaterThanOrEqual(WEAPONS_CUE_MS);
      }
      if (step.cmd.type === "SetNature" && step.cmd.natureCode === "ROBBERY-IP") {
        expect(step.atMs).toBeGreaterThanOrEqual(WEAPONS_CUE_MS);
      }
    }

    const rt = new Runtime({
      pack,
      scenarioId: "golden_pass",
      seed: 305001,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.applyAll(commands);
    const d = rt.debrief();
    expect(d.hardFails).toEqual([]);
    expect(d.passed).toBe(true);

    const record = {
      schemaVersion: 1 as const,
      scenarioId: "golden_pass",
      packId: pack.id,
      packVersion: pack.version,
      seed: 305001,
      engineVersion: ENGINE_VERSION,
      commands,
    };
    const { debrief: d2 } = replaySession(
      pack,
      baseUnitsA07(),
      [incidentRobberyBadAddress()],
      record
    );
    expect(d2.passed).toBe(true);
  });

  it("FAIL: concurrency — P1 ages while player only works P4 cosmetics", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "aging",
      seed: 7,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    // Make high priority knowable then leave pending
    rt.applyAll([
      { atMs: 16000, cmd: { type: "Advance", ms: 0 } },
      {
        atMs: 17000,
        cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P1" },
      },
      {
        atMs: 18000,
        cmd: { type: "AddNote", incidentId: "cfs-001", text: "Still pending" },
      },
      { atMs: 90000, cmd: { type: "NoOp" } },
    ] as Array<{ atMs: number; cmd: PlayerCommand }>);
    const d = rt.debrief();
    expect(d.hardFails.some((f) => f.code === "FAIL_PRIORITY_AGING")).toBe(true);
  });
});
