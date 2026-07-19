import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PackSchema, type DoctrinePack } from "./pack.js";
import { LEGAL_NEXT, ASSIGNABLE, UNIT_STATUSES } from "./doctrine/statusMatrix.js";

const here = dirname(fileURLToPath(import.meta.url));

export function defaultPackDir(packId = "miami-a07-police-v0"): string {
  return join(here, "..", "..", "..", "packs", packId);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Load split pack v0.2 or legacy monolith pack.json */
export function loadPackFromDir(dir: string): DoctrinePack {
  const packMeta = readJson(join(dir, "pack.json")) as Record<string, unknown>;

  // Legacy single-file shape
  if (Array.isArray(packMeta.priorities)) {
    return PackSchema.parse(packMeta);
  }

  const priorities = (readJson(join(dir, "priorities.json")) as { priorities: unknown[] })
    .priorities;
  const naturesFile = readJson(join(dir, "natures.json")) as { natures: unknown[] };
  const dispositions = (
    readJson(join(dir, "dispositions.json")) as { dispositions: { code: string; label: string }[] }
  ).dispositions;
  const radio = readJson(join(dir, "radio_templates.json")) as {
    channelPrimary: string;
    plainLanguage?: true;
    readbackTimeoutMs?: number;
    requiredDispatchElements?: string[];
    slotsClosedSet?: string[];
  };
  const assignment = readJson(join(dir, "assignment.json")) as DoctrinePack["assignment"];
  const zones = (readJson(join(dir, "zones.json")) as { zones: DoctrinePack["zones"] }).zones;
  const rubricFile = readJson(join(dir, "rubric.json")) as {
    hard?: { id: string; code: string; severity: "hard_fail"; message: string; ruleRef: string }[];
    rules?: {
      id?: string;
      code: string;
      severity?: "hard_fail";
      message?: string;
      messageTemplate?: string;
      ruleRef?: string;
    }[];
  };
  const hardRules = rubricFile.hard ?? rubricFile.rules ?? [];

  // Prefer matrix-derived statuses if unit_statuses present
  let unitStatuses = UNIT_STATUSES.map((code) => ({
    code,
    assignable: ASSIGNABLE[code],
    next: LEGAL_NEXT[code],
  }));
  const usPath = join(dir, "unit_statuses.json");
  if (existsSync(usPath)) {
    const us = readJson(usPath) as {
      statuses: {
        code: DoctrinePack["unitStatuses"][0]["code"];
        assignable: boolean;
        next?: DoctrinePack["unitStatuses"][0]["code"][];
        legal_next?: DoctrinePack["unitStatuses"][0]["code"][];
      }[];
    };
    if (us.statuses?.length) {
      unitStatuses = us.statuses.map((s) => ({
        code: s.code,
        assignable: s.assignable,
        // filter self-loops from agent packs
        next: (s.next ?? s.legal_next ?? LEGAL_NEXT[s.code]).filter((t) => t !== s.code),
      }));
    }
  }

  const monolith = {
    id: packMeta.id,
    version: packMeta.version,
    title: packMeta.title,
    localeDefault: packMeta.localeDefault ?? "en",
    disclaimer: packMeta.disclaimer,
    consoleId: packMeta.consoleId ?? "A07",
    sectorId: packMeta.sectorId,
    priorities: (priorities as Record<string, unknown>[]).map((p) => ({
      code: p.code as DoctrinePack["priorities"][0]["code"],
      name: String(p.name),
      dispatchSlaMs: Number(p.dispatch_sla_ms ?? p.dispatchSlaMs),
      stackAllowed: Boolean(p.stack_allowed ?? p.stackAllowed),
      radioPreempt: (p.radio_preempt ?? p.radioPreempt) as DoctrinePack["priorities"][0]["radioPreempt"],
    })),
    unitStatuses,
    natures: (naturesFile.natures as Record<string, unknown>[]).map((n) => ({
      code: String(n.code),
      label: String(n.label),
      defaultPriority: n.defaultPriority as DoctrinePack["natures"][0]["defaultPriority"],
      requiresBackup: Boolean(n.requiresBackup ?? false),
      weaponsLikely: Boolean(n.weaponsLikely ?? false),
      inProgressDefault: Boolean(n.inProgressDefault ?? false),
    })),
    dispositions,
    radio: {
      channelPrimary: radio.channelPrimary ?? "SE305-PRI",
      plainLanguage: true as const,
      dispatchTemplate: "{to_units}, {priority} {nature}, {location}",
      readbackTimeoutMs: radio.readbackTimeoutMs ?? 45000,
      requiredDispatchElements: radio.requiredDispatchElements ?? [
        "unit",
        "priority",
        "nature",
        "location",
      ],
    },
    assignment: {
      minBackupUnitsP1: assignment.minBackupUnitsP1 ?? 2,
      allowOosAssign: assignment.allowOosAssign ?? false,
      requireVerifiedOrPartialForP1: assignment.requireVerifiedOrPartialForP1 ?? true,
    },
    rubric: hardRules.map((r) => ({
      id: r.id ?? r.code,
      code: r.code,
      severity: "hard_fail" as const,
      message: r.message ?? r.messageTemplate ?? r.code,
      ruleRef: r.ruleRef ?? r.code,
    })),
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      jurisdictionId: z.jurisdictionId,
    })),
  };

  return PackSchema.parse(monolith);
}

export function loadPackFromFile(path: string): DoctrinePack {
  // If path is pack.json in a dir, load dir
  if (path.endsWith("pack.json")) {
    return loadPackFromDir(dirname(path));
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return PackSchema.parse(raw);
}

export function loadDefaultPack(): DoctrinePack {
  return loadPackFromDir(defaultPackDir());
}

export function engineVersion(): string {
  try {
    const meta = readJson(join(defaultPackDir(), "pack.json")) as { engineVersion?: string; version?: string };
    return meta.engineVersion ?? meta.version ?? "0.2.0";
  } catch {
    return "0.2.0";
  }
}
