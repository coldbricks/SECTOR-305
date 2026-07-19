/**
 * Scenario JSON → Runtime factory.
 * Loads committed scenario.json metadata and materializes units/incidents
 * via registered builders (checkride fixtures / watch builders).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DoctrinePack } from "../pack.js";
import { Runtime } from "../runtime.js";
import type { Incident, SessionRecord, Unit } from "../types.js";
import { FRIDAY_NIGHT_META } from "../watch/fridayNight.js";
import { loadDefaultPack, defaultPackDir } from "../loadPack.js";
import {
  listA07ScenarioIds,
  materializeA07Scenario,
} from "../scenarios/a07Library.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

export interface ScenarioMeta {
  id: string;
  version?: string;
  kind: string;
  packId: string;
  seed: number;
  title?: string;
  durationMs?: number;
  implementation?: string;
  expectedHardFailsOnFailSession?: string[];
  passConditions?: { noHardFails?: boolean };
  adversarialTags?: string[];
  raw: Record<string, unknown>;
}

export interface MaterializedScenario {
  meta: ScenarioMeta;
  pack: DoctrinePack;
  units: Unit[];
  incidents: Incident[];
  scenarioDir: string;
}

type Builder = (meta: ScenarioMeta) => { units: Unit[]; incidents: Incident[] };

/** All A07 library ids materialize via a07Library (single source of truth). */
const BUILDERS: Record<string, Builder> = Object.fromEntries(
  listA07ScenarioIds().map((id) => [
    id,
    () => {
      const { units, incidents } = materializeA07Scenario(id);
      return { units, incidents };
    },
  ])
);

export function scenariosRoot(): string {
  return join(repoRoot, "scenarios");
}

export function readScenarioMeta(scenarioDir: string): ScenarioMeta {
  const path = join(scenarioDir, "scenario.json");
  if (!existsSync(path)) {
    throw new Error(`scenario.json missing: ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.kind !== "string") {
    throw new Error(`scenario.json incomplete at ${path}`);
  }
  if (typeof raw.packId !== "string" || typeof raw.seed !== "number") {
    throw new Error(`scenario.json missing packId/seed at ${path}`);
  }
  return {
    id: raw.id,
    version: typeof raw.version === "string" ? raw.version : undefined,
    kind: raw.kind,
    packId: raw.packId,
    seed: raw.seed,
    title: typeof raw.title === "string" ? raw.title : undefined,
    durationMs: typeof raw.durationMs === "number" ? raw.durationMs : undefined,
    implementation:
      typeof raw.implementation === "string" ? raw.implementation : undefined,
    expectedHardFailsOnFailSession: Array.isArray(raw.expectedHardFailsOnFailSession)
      ? (raw.expectedHardFailsOnFailSession as string[])
      : undefined,
    passConditions: raw.passConditions as ScenarioMeta["passConditions"],
    adversarialTags: Array.isArray(raw.adversarialTags)
      ? (raw.adversarialTags as string[])
      : undefined,
    raw,
  };
}

export function materializeScenario(
  scenarioId: string,
  pack?: DoctrinePack
): MaterializedScenario {
  const scenarioDir = join(scenariosRoot(), scenarioId);
  const meta = readScenarioMeta(scenarioDir);
  if (meta.id !== scenarioId) {
    throw new Error(`scenario id mismatch: dir=${scenarioId} json=${meta.id}`);
  }
  const builder = BUILDERS[scenarioId];
  if (!builder) {
    throw new Error(
      `No Runtime builder registered for scenario id ${scenarioId}. Register in loadScenario.ts BUILDERS.`
    );
  }
  const { units, incidents } = builder(meta);
  const resolvedPack =
    pack ??
    (meta.packId === "miami-a07-police-v0"
      ? loadDefaultPack()
      : loadDefaultPack());
  return { meta, pack: resolvedPack, units, incidents, scenarioDir };
}

export function createRuntimeFromScenario(
  scenarioId: string,
  pack?: DoctrinePack
): { runtime: Runtime; material: MaterializedScenario } {
  const material = materializeScenario(scenarioId, pack);
  const runtime = new Runtime({
    pack: material.pack,
    scenarioId: material.meta.id,
    seed: material.meta.seed,
    units: material.units,
    incidents: material.incidents,
  });
  return { runtime, material };
}

export function loadCompanionSession(
  scenarioDir: string,
  which: "fail" | "pass"
): SessionRecord {
  const name = which === "fail" ? "session_fail.json" : "session_pass.json";
  const path = join(scenarioDir, name);
  if (!existsSync(path)) {
    throw new Error(`Companion session missing: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as SessionRecord;
}

export function listRegisteredScenarioIds(): string[] {
  return Object.keys(BUILDERS);
}

/** Watch meta cross-check */
export function fridayMetaConsistent(meta: ScenarioMeta): boolean {
  return (
    meta.id === FRIDAY_NIGHT_META.id &&
    meta.seed === FRIDAY_NIGHT_META.seed &&
    (meta.durationMs === undefined ||
      meta.durationMs === FRIDAY_NIGHT_META.durationMs)
  );
}

void defaultPackDir;
