import { z } from "zod";
import type { PriorityCode, UnitStatus } from "./types.js";

export const PackSchema = z.object({
  id: z.string(),
  version: z.string(),
  title: z.string(),
  localeDefault: z.string().default("en"),
  disclaimer: z.string(),
  consoleId: z.string().default("A07"),
  sectorId: z.string(),
  priorities: z.array(
    z.object({
      code: z.enum(["P0", "P1", "P2", "P3", "P4", "P5"]),
      name: z.string(),
      dispatchSlaMs: z.number(),
      stackAllowed: z.boolean(),
      radioPreempt: z.enum(["full", "high", "medium", "low", "none"]),
    })
  ),
  unitStatuses: z.array(
    z.object({
      code: z.enum(["AVL", "DIS", "ER", "OS", "CLR", "OOS", "BSI", "EMR"]),
      assignable: z.boolean(),
      next: z.array(z.enum(["AVL", "DIS", "ER", "OS", "CLR", "OOS", "BSI", "EMR"])),
    })
  ),
  natures: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      defaultPriority: z.enum(["P0", "P1", "P2", "P3", "P4", "P5"]),
      requiresBackup: z.boolean().default(false),
      weaponsLikely: z.boolean().default(false),
      inProgressDefault: z.boolean().default(false),
    })
  ),
  dispositions: z.array(z.object({ code: z.string(), label: z.string() })),
  radio: z.object({
    channelPrimary: z.string(),
    plainLanguage: z.literal(true),
    dispatchTemplate: z.string(),
    readbackTimeoutMs: z.number().default(45000),
    requiredDispatchElements: z.array(z.string()),
  }),
  assignment: z.object({
    minBackupUnitsP1: z.number().default(2),
    allowOosAssign: z.boolean().default(false),
    requireVerifiedOrPartialForP1: z.boolean().default(true),
  }),
  rubric: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      severity: z.enum(["hard_fail", "soft", "note"]),
      message: z.string(),
      ruleRef: z.string(),
    })
  ),
  zones: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      jurisdictionId: z.string(),
    })
  ),
});

export type DoctrinePack = z.infer<typeof PackSchema>;

export function priorityRank(p: PriorityCode): number {
  return { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }[p];
}

export function canTransition(
  pack: DoctrinePack,
  from: UnitStatus,
  to: UnitStatus
): boolean {
  const row = pack.unitStatuses.find((s) => s.code === from);
  if (!row) return false;
  return row.next.includes(to);
}

export function isAssignable(pack: DoctrinePack, status: UnitStatus): boolean {
  return pack.unitStatuses.find((s) => s.code === status)?.assignable ?? false;
}

export function natureByCode(pack: DoctrinePack, code: string) {
  return pack.natures.find((n) => n.code === code);
}
