/** Knowable-cue schedule — information-set grading (C10). */

export type CueKind =
  | "location_hint"
  | "weapons_cue"
  | "nature_cue"
  | "language_barrier"
  | "unit_sizeup"
  | "priority_cue";

export interface KnowableCue {
  id: string;
  kind: CueKind;
  becomesKnowableAtMs: number;
  payload: Record<string, string | boolean | number>;
  applied?: boolean;
}

export function cuesKnowableAt(cues: KnowableCue[], clockMs: number): KnowableCue[] {
  return cues.filter((c) => c.becomesKnowableAtMs <= clockMs);
}

export function isCueKnowable(cues: KnowableCue[], id: string, clockMs: number): boolean {
  const c = cues.find((x) => x.id === id);
  return !!c && c.becomesKnowableAtMs <= clockMs;
}

export function weaponsKnowable(cues: KnowableCue[], clockMs: number, flags: string[]): boolean {
  if (flags.includes("WEAPONS")) return true;
  return cuesKnowableAt(cues, clockMs).some(
    (c) => c.kind === "weapons_cue" || c.payload.weapons === true
  );
}

export function highAcuityKnowable(
  cues: KnowableCue[],
  clockMs: number,
  flags: string[],
  playerPriorityRank: number,
  truthRank: number
): boolean {
  if (playerPriorityRank <= 1) return true;
  if (flags.includes("IN_PROGRESS") || flags.includes("WEAPONS")) return true;
  if (weaponsKnowable(cues, clockMs, flags)) return true;
  return cuesKnowableAt(cues, clockMs).some(
    (c) => c.kind === "priority_cue" || c.kind === "nature_cue"
  ) && truthRank <= 1;
}
