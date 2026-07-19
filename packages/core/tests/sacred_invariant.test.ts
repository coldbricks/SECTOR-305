import { describe, expect, it } from "vitest";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDefaultPack } from "../src/loadPack.js";
import { baseUnitsA07, incidentRobberyBadAddress } from "../src/fixtures.js";
import { Runtime, replaySession } from "../src/runtime.js";
import type { SessionRecord } from "../src/types.js";
import {
  hardMultisetKey,
  includesAllHard,
  hardCodesFromGrades,
} from "../src/grade/multiset.js";
import { ENGINE_VERSION } from "../src/schema/common.js";
import { failCommands, passCommands } from "./checkride_sessions.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const failPath = join(
  root,
  "scenarios/checkride_a07_ocean_robbery_v1/session_fail.json"
);
const passPath = join(
  root,
  "scenarios/checkride_a07_ocean_robbery_v1/session_pass.json"
);

/** Hard codes the committed fail golden must produce (M04 / M08 bind). */
const FAIL_HARD_REQUIRED = [
  "FAIL_NO_VERIFY",
  "FAIL_PRIORITY_UNDERCODE",
  "FAIL_NO_READBACK",
] as const;

function replayRecord(
  pack: ReturnType<typeof loadDefaultPack>,
  record: SessionRecord
) {
  return replaySession(
    pack,
    baseUnitsA07(),
    [incidentRobberyBadAddress()],
    record
  );
}

describe("M08 sacred invariant — SessionRecord headless replay", () => {
  const pack = loadDefaultPack();

  it("fail path: post-cue hard fails + double-replay identical", () => {
    const commands = failCommands();
    const rt1 = new Runtime({
      pack,
      scenarioId: "checkride_a07_ocean_robbery_v1",
      seed: 305001,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt1.applyAll(commands);
    const d1 = rt1.debrief();
    const key1 = hardMultisetKey(d1.hardFails);

    const record: SessionRecord = {
      schemaVersion: 1,
      scenarioId: "checkride_a07_ocean_robbery_v1",
      packId: pack.id,
      packVersion: pack.version,
      seed: 305001,
      engineVersion: ENGINE_VERSION,
      commands,
    };

    const r2 = replayRecord(pack, record);
    const r3 = replayRecord(pack, record);

    expect(hardMultisetKey(r2.debrief.hardFails)).toBe(key1);
    expect(hardMultisetKey(r3.debrief.hardFails)).toBe(key1);
    expect(r2.debrief.passed).toBe(false);

    expect(
      includesAllHard(d1.hardFails, [
        "FAIL_NO_VERIFY",
        "FAIL_PRIORITY_UNDERCODE",
        "FAIL_NO_READBACK",
        "FAIL_NO_BACKUP",
      ])
    ).toBe(true);

    for (const g of d1.hardFails) {
      if (
        [
          "FAIL_PRIORITY_UNDERCODE",
          "FAIL_NO_VERIFY",
          "FAIL_NO_BACKUP",
          "FAIL_SAFETY_NOT_AIRED",
        ].includes(g.code)
      ) {
        expect(g.atMs).toBeGreaterThanOrEqual(15000);
      }
    }
    expect(hardCodesFromGrades(d1.hardFails).length).toBeGreaterThanOrEqual(4);
  });

  it("pass path: zero hard fails, double-replay empty multiset", () => {
    const commands = passCommands();
    const record: SessionRecord = {
      schemaVersion: 1,
      scenarioId: "checkride_a07_ocean_robbery_v1_pass",
      packId: pack.id,
      packVersion: pack.version,
      seed: 305001,
      engineVersion: ENGINE_VERSION,
      commands,
    };
    const a = replayRecord(pack, record);
    const b = replayRecord(pack, record);
    expect(a.debrief.passed).toBe(true);
    expect(a.debrief.hardFails).toEqual([]);
    expect(hardMultisetKey(a.debrief.hardFails)).toBe(
      hardMultisetKey(b.debrief.hardFails)
    );
  });

  /**
   * S1-VACUOUS fix: bind committed session_fail.json with NO rewrite.
   * Must NOT call any writeSessionFiles / regenerate helper.
   * Asserts are bare — no try/catch may swallow failures.
   * External corruption of this file must turn this test red.
   */
  it("committed session_fail.json is bound WITHOUT rewrite (S1-VACUOUS)", () => {
    expect(existsSync(failPath)).toBe(true);
    const record = JSON.parse(readFileSync(failPath, "utf8")) as SessionRecord;
    expect(record.commands.length).toBeGreaterThan(0);
    const { debrief } = replayRecord(pack, record);
    expect(includesAllHard(debrief.hardFails, [...FAIL_HARD_REQUIRED])).toBe(
      true
    );
  });

  /**
   * In-process mutation protocol (author proof; VERIFIER re-runs externally):
   * corrupt session_fail.json on disk → includesAllHard false → restore → true.
   * try/finally restores the golden only; it does NOT catch assertion failures.
   */
  it("mutation: corrupt session_fail.json → includesAllHard false; restore → true", () => {
    expect(existsSync(failPath)).toBe(true);
    const bak = failPath + ".bak";
    copyFileSync(failPath, bak);
    try {
      const rec = JSON.parse(readFileSync(failPath, "utf8")) as SessionRecord;
      // Corrupt one command (DispatchUnits → NoOp), keep remaining steps
      const di = rec.commands.findIndex((c) => c.cmd?.type === "DispatchUnits");
      expect(di).toBeGreaterThanOrEqual(0);
      rec.commands[di] = { atMs: rec.commands[di].atMs, cmd: { type: "NoOp" } };
      writeFileSync(failPath, JSON.stringify(rec, null, 2) + "\n");

      const broken = JSON.parse(readFileSync(failPath, "utf8")) as SessionRecord;
      const { debrief } = replayRecord(pack, broken);
      expect(includesAllHard(debrief.hardFails, [...FAIL_HARD_REQUIRED])).toBe(
        false
      );
    } finally {
      copyFileSync(bak, failPath);
      unlinkSync(bak);
    }

    const good = JSON.parse(readFileSync(failPath, "utf8")) as SessionRecord;
    const { debrief } = replayRecord(pack, good);
    expect(includesAllHard(debrief.hardFails, [...FAIL_HARD_REQUIRED])).toBe(
      true
    );
  });

  /**
   * S1-VACUOUS acceptance also covers session_pass.json:
   * read committed file only — no regenerate. Empty/NoOp play must not
   * satisfy the bind (vacuous "passed with zero hard fails" is not enough).
   */
  it("committed session_pass.json bound without rewrite", () => {
    expect(existsSync(passPath)).toBe(true);
    const record = JSON.parse(readFileSync(passPath, "utf8")) as SessionRecord;
    const types = record.commands.map((c) => c.cmd.type);
    // Structural bind: a real pass script, not a decorative empty session
    expect(record.commands.length).toBeGreaterThanOrEqual(8);
    expect(types).toContain("VerifyLocation");
    expect(types).toContain("DispatchUnits");
    const { debrief } = replayRecord(pack, record);
    expect(debrief.passed).toBe(true);
    expect(debrief.hardFails).toEqual([]);
  });
});
