import type { UnitStatus } from "../types.js";

export const UNIT_STATUSES: UnitStatus[] = [
  "AVL",
  "DIS",
  "ER",
  "OS",
  "CLR",
  "OOS",
  "BSI",
  "EMR",
];

/** Legal adjacency list — source of truth for 64-cell matrix generation */
export const LEGAL_NEXT: Record<UnitStatus, UnitStatus[]> = {
  AVL: ["DIS", "OOS", "BSI", "EMR"],
  DIS: ["ER", "AVL", "OOS", "EMR"],
  ER: ["OS", "AVL", "OOS", "EMR"],
  OS: ["CLR", "ER", "AVL", "OOS", "EMR"],
  CLR: ["AVL", "OOS"],
  OOS: ["AVL"],
  BSI: ["AVL", "OS", "OOS", "DIS"],
  EMR: ["OS", "AVL", "OOS"],
};

export const ASSIGNABLE: Record<UnitStatus, boolean> = {
  AVL: true,
  DIS: false,
  ER: false,
  OS: false,
  CLR: false,
  OOS: false,
  BSI: false,
  EMR: false,
};

export interface StatusCell {
  from: UnitStatus;
  to: UnitStatus;
  legal: boolean;
  reason: string;
}

export function buildStatusMatrix(): StatusCell[] {
  const cells: StatusCell[] = [];
  for (const from of UNIT_STATUSES) {
    for (const to of UNIT_STATUSES) {
      if (from === to) {
        cells.push({
          from,
          to,
          legal: false,
          reason: "self_transition_noop_not_via_setStatus",
        });
        continue;
      }
      const legal = LEGAL_NEXT[from].includes(to);
      cells.push({
        from,
        to,
        legal,
        reason: legal ? "pack_legal_edge" : "illegal_edge",
      });
    }
  }
  if (cells.length !== 64) {
    throw new Error(`Status matrix must be 64 cells, got ${cells.length}`);
  }
  return cells;
}

export function canTransitionStatus(from: UnitStatus, to: UnitStatus): boolean {
  if (from === to) return false;
  return LEGAL_NEXT[from].includes(to);
}

export function isAssignableStatus(s: UnitStatus): boolean {
  return ASSIGNABLE[s];
}

export function legalCount(): number {
  return buildStatusMatrix().filter((c) => c.legal).length;
}

export function illegalCount(): number {
  return buildStatusMatrix().filter((c) => !c.legal).length;
}
