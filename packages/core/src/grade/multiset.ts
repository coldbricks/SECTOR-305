import type { GradeEvent } from "../types.js";
import { hardFailMultiset, isHardFailCode } from "./codes.js";

export function hardCodesFromGrades(grades: GradeEvent[]): string[] {
  return grades.filter((g) => g.severity === "hard_fail").map((g) => g.code);
}

export function softCodesFromGrades(grades: GradeEvent[]): string[] {
  return grades
    .filter((g) => g.severity === "soft")
    .map((g) => g.code)
    .sort();
}

/** Sacred invariant comparison key for hard fails */
export function hardMultisetKey(grades: GradeEvent[]): string {
  return hardFailMultiset(hardCodesFromGrades(grades));
}

export function softMultisetKey(grades: GradeEvent[]): string {
  return softCodesFromGrades(grades).join("|");
}

export function assertHardMultisetEqual(
  a: GradeEvent[],
  b: GradeEvent[],
  label = "hard multiset"
): void {
  const ka = hardMultisetKey(a);
  const kb = hardMultisetKey(b);
  if (ka !== kb) {
    throw new Error(`${label} mismatch:\n  A: ${ka}\n  B: ${kb}`);
  }
}

export function includesAllHard(grades: GradeEvent[], required: string[]): boolean {
  const set = new Set(hardCodesFromGrades(grades));
  return required.every((c) => set.has(c));
}

export function onlyHardCodes(codes: string[]): string[] {
  return codes.filter(isHardFailCode);
}
