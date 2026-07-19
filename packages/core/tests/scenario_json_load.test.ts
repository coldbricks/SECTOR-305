/**
 * S3-4: committed scenario.json files must be consumed by a real code path.
 *
 * Runtime fixtures still seed checkride/watch state; this suite binds the
 * authoring JSON on disk so M04/M05 coverage rows cannot claim decorative files.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ScenarioSchema } from "../src/schema/scenario.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function loadScenarioJson(relPath: string): Record<string, unknown> {
  const abs = join(repoRoot, relPath);
  expect(existsSync(abs), `missing scenario file: ${relPath}`).toBe(true);
  const raw: unknown = JSON.parse(readFileSync(abs, "utf8"));
  expect(raw).toBeTypeOf("object");
  expect(raw).not.toBeNull();
  return raw as Record<string, unknown>;
}

/** Shared spine fields → ScenarioSchema (strict); drops authoring-only extras. */
function parseSharedScenarioSpine(raw: Record<string, unknown>) {
  const pass = raw.passConditions as { noHardFails?: boolean } | undefined;
  return ScenarioSchema.parse({
    id: raw.id,
    version: raw.version,
    kind: raw.kind,
    packId: raw.packId,
    seed: raw.seed,
    title: raw.title,
    description: raw.description,
    adversarialTags: raw.adversarialTags ?? [],
    contentNotes: raw.contentNotes ?? [],
    units: raw.units,
    incidents: raw.incidents,
    timeline: raw.timeline ?? [],
    passConditions: {
      noHardFails: pass?.noHardFails ?? true,
    },
    expectedHardFails:
      (raw.expectedHardFails as string[] | undefined) ??
      (raw.expectedHardFailsOnFailSession as string[] | undefined),
    failDemo: raw.failDemo,
    consoleId: raw.consoleId,
  });
}

describe("S3-4 scenario.json consumed by code path", () => {
  it("loads checkride scenario.json, asserts fields, parses shared spine", () => {
    const raw = loadScenarioJson(
      "scenarios/checkride_a07_ocean_robbery_v1/scenario.json"
    );

    expect(raw.id).toBe("checkride_a07_ocean_robbery_v1");
    expect(raw.version).toBe("1.0.0");
    expect(raw.kind).toBe("checkride");
    expect(raw.packId).toBe("miami-a07-police-v0");
    expect(raw.seed).toBe(305001);
    expect(raw.title).toMatch(/Ocean/i);
    expect(raw.adversarialTags).toEqual(
      expect.arrayContaining(["C1", "C2", "C4", "C5"])
    );
    expect(Array.isArray(raw.contentNotes)).toBe(true);
    expect((raw.contentNotes as string[]).length).toBeGreaterThan(0);

    const pass = raw.passConditions as { noHardFails: boolean };
    expect(pass.noHardFails).toBe(true);

    const expectedHard = raw.expectedHardFailsOnFailSession as string[];
    expect(expectedHard).toEqual(
      expect.arrayContaining([
        "FAIL_NO_VERIFY",
        "FAIL_PRIORITY_UNDERCODE",
        "FAIL_NO_READBACK",
        "FAIL_NO_BACKUP",
        "FAIL_SAFETY_NOT_AIRED",
      ])
    );
    expect(expectedHard.length).toBeGreaterThanOrEqual(3);

    const parsed = parseSharedScenarioSpine(raw);
    expect(parsed.id).toBe("checkride_a07_ocean_robbery_v1");
    expect(parsed.kind).toBe("checkride");
    expect(parsed.seed).toBe(305001);
    expect(parsed.passConditions.noHardFails).toBe(true);
    expect(parsed.expectedHardFails).toEqual(
      expect.arrayContaining(["FAIL_NO_VERIFY", "FAIL_PRIORITY_UNDERCODE"])
    );
  });

  it("loads watch scenario.json, asserts fields, parses shared spine", () => {
    const raw = loadScenarioJson("scenarios/watch_a07_friday_night_v1/scenario.json");

    expect(raw.id).toBe("watch_a07_friday_night_v1");
    expect(raw.version).toBe("1.0.0");
    expect(raw.kind).toBe("watch");
    expect(raw.packId).toBe("miami-a07-police-v0");
    expect(raw.seed).toBe(305200);
    expect(raw.title).toMatch(/Friday night/i);
    expect(raw.durationMs).toBe(900_000);
    expect(raw.minCfs).toBeGreaterThanOrEqual(9);
    expect(raw.minUnits).toBeGreaterThanOrEqual(10);
    expect(raw.adversarialTags).toEqual(
      expect.arrayContaining(["C6", "C7", "C8"])
    );
    expect(Array.isArray(raw.contentNotes)).toBe(true);

    const pass = raw.passConditions as { noHardFails: boolean; note?: string };
    expect(pass.noHardFails).toBe(false);
    expect(pass.note).toMatch(/FAIL_PRIORITY_AGING/);

    const impl = raw.implementation as string;
    expect(impl).toBe("packages/core/src/watch/fridayNight.ts");
    expect(existsSync(join(repoRoot, impl))).toBe(true);

    const parsed = parseSharedScenarioSpine(raw);
    expect(parsed.id).toBe("watch_a07_friday_night_v1");
    expect(parsed.kind).toBe("watch");
    expect(parsed.seed).toBe(305200);
    expect(parsed.passConditions.noHardFails).toBe(false);
    expect(parsed.adversarialTags).toEqual(
      expect.arrayContaining(["C6", "C7", "C8"])
    );
  });

  it("both scenario.json ids are unique and pack-bound", () => {
    const checkride = loadScenarioJson(
      "scenarios/checkride_a07_ocean_robbery_v1/scenario.json"
    );
    const watch = loadScenarioJson(
      "scenarios/watch_a07_friday_night_v1/scenario.json"
    );
    expect(checkride.id).not.toBe(watch.id);
    expect(checkride.packId).toBe(watch.packId);
    expect(checkride.seed).not.toBe(watch.seed);
  });
});
