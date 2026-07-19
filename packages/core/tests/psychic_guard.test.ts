/**
 * S1-PSYCHIC acceptance: no golden command may use truth-derived facts before cue time.
 * Scans in-memory goldens AND committed SessionRecord JSON against knowableSchedule.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { failCommands, passCommands } from "./checkride_sessions.js";
import { incidentRobberyBadAddress } from "../src/fixtures.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";
import { baseUnitsA07 } from "../src/fixtures.js";
import type { PlayerCommand, SessionRecord } from "../src/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const failPath = join(
  root,
  "scenarios/checkride_a07_ocean_robbery_v1/session_fail.json"
);
const passPath = join(
  root,
  "scenarios/checkride_a07_ocean_robbery_v1/session_pass.json"
);

type Step = { atMs: number; cmd: PlayerCommand };

function cueMs(
  schedule: NonNullable<
    ReturnType<typeof incidentRobberyBadAddress>["truth"]["knowableSchedule"]
  >,
  facets: string[]
): number {
  const hits = schedule.filter((c) => facets.includes(c.facet)).map((c) => c.atMs);
  expect(hits.length).toBeGreaterThan(0);
  return Math.min(...hits);
}

/** Assert no clairvoyant truth-derived command before enabling cue. */
function assertNoClairvoyance(
  steps: Step[],
  weaponsCueMs: number,
  locationCueMs: number
): void {
  for (const step of steps) {
    const { atMs, cmd } = step;

    if (cmd.type === "VerifyLocation") {
      const free = cmd.location?.freeform ?? "";
      const block = cmd.location?.block ?? "";
      if (free.includes("1400") || block === "1400") {
        expect(atMs).toBeGreaterThanOrEqual(locationCueMs);
      }
    }

    if (cmd.type === "SetPriority" && ["P0", "P1"].includes(cmd.priority)) {
      expect(atMs).toBeGreaterThanOrEqual(weaponsCueMs);
    }

    if (cmd.type === "SetNature" && cmd.natureCode === "ROBBERY-IP") {
      expect(atMs).toBeGreaterThanOrEqual(weaponsCueMs);
    }

    if (cmd.type === "SetFlag" && cmd.flag === "WEAPONS" && cmd.value) {
      expect(atMs).toBeGreaterThanOrEqual(weaponsCueMs);
    }

    if (cmd.type === "DispatchUnits") {
      const cap = cmd.radioCaption ?? "";
      if (/1400/.test(cap)) {
        expect(atMs).toBeGreaterThanOrEqual(locationCueMs);
      }
      if (/weapon|gun|knife|armed|robbery/i.test(cap)) {
        expect(atMs).toBeGreaterThanOrEqual(weaponsCueMs);
      }
      // Fail-path undercode dispatch must not predate acuity cue
      if (/P3|P4|P5/.test(cap) || !cmd.radioCaption) {
        // no-op — structural timing checked separately for fail dispatch
      }
    }
  }
}

describe("S1-PSYCHIC golden fairness guard", () => {
  const inc = incidentRobberyBadAddress();
  const schedule = inc.truth.knowableSchedule;
  expect(schedule).toBeDefined();
  const sched = schedule!;
  const weaponsCueMs = cueMs(sched, ["weapons", "nature", "priority"]);
  const locationCueMs = cueMs(sched, ["location"]);

  it("fixture knowableSchedule: weapons/nature/priority @15000, location @25000", () => {
    expect(weaponsCueMs).toBe(15000);
    expect(locationCueMs).toBe(25000);
    expect(sched.some((c) => c.facet === "weapons" && c.atMs === 15000)).toBe(
      true
    );
    expect(sched.some((c) => c.facet === "nature" && c.atMs === 15000)).toBe(
      true
    );
    expect(sched.some((c) => c.facet === "priority" && c.atMs === 15000)).toBe(
      true
    );
    expect(sched.some((c) => c.facet === "location" && c.atMs === 25000)).toBe(
      true
    );
  });

  it("in-memory passCommands never use truth before cue", () => {
    assertNoClairvoyance(passCommands(), weaponsCueMs, locationCueMs);
  });

  it("in-memory failCommands dispatch only after weapons cue", () => {
    const dispatches = failCommands().filter((s) => s.cmd.type === "DispatchUnits");
    expect(dispatches.length).toBeGreaterThan(0);
    for (const d of dispatches) {
      expect(d.atMs).toBeGreaterThanOrEqual(weaponsCueMs);
    }
    assertNoClairvoyance(failCommands(), weaponsCueMs, locationCueMs);
  });

  it("committed session_pass.json never uses truth before cue", () => {
    expect(existsSync(passPath)).toBe(true);
    const rec = JSON.parse(readFileSync(passPath, "utf8")) as SessionRecord;
    assertNoClairvoyance(rec.commands as Step[], weaponsCueMs, locationCueMs);
  });

  it("committed session_fail.json dispatch only after weapons cue", () => {
    expect(existsSync(failPath)).toBe(true);
    const rec = JSON.parse(readFileSync(failPath, "utf8")) as SessionRecord;
    const dispatches = (rec.commands as Step[]).filter(
      (s) => s.cmd.type === "DispatchUnits"
    );
    expect(dispatches.length).toBeGreaterThan(0);
    for (const d of dispatches) {
      expect(d.atMs).toBeGreaterThanOrEqual(weaponsCueMs);
    }
    assertNoClairvoyance(rec.commands as Step[], weaponsCueMs, locationCueMs);
  });

  it("fail runtime hard-fails (undercode/verify/backup/safety) atMs >= weapons cue", () => {
    const pack = loadDefaultPack();
    const rt = new Runtime({
      pack,
      scenarioId: "psychic_fail_grade_times",
      seed: 305001,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.applyAll(failCommands());
    const d = rt.debrief();
    const watched = [
      "FAIL_PRIORITY_UNDERCODE",
      "FAIL_NO_VERIFY",
      "FAIL_NO_BACKUP",
      "FAIL_SAFETY_NOT_AIRED",
    ];
    for (const code of watched) {
      const hits = d.hardFails.filter((h) => h.code === code);
      expect(hits.length).toBeGreaterThan(0);
      for (const h of hits) {
        expect(h.atMs).toBeGreaterThanOrEqual(weaponsCueMs);
      }
    }
    // Sacred three still present
    const codes = new Set(d.hardFails.map((h) => h.code));
    expect(codes.has("FAIL_NO_VERIFY")).toBe(true);
    expect(codes.has("FAIL_PRIORITY_UNDERCODE")).toBe(true);
    expect(codes.has("FAIL_NO_READBACK")).toBe(true);
  });
});
