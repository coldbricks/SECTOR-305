/**
 * Soft-band scoring — coaching weight product (never invents FAIL codes).
 * Weights mirror packs/miami-a07-police-v0/rubric_soft.json (house law).
 * Checkride hard pass still requires zero hard_fail; soft band is coaching product.
 */

import type { SoftCode } from "./codes.js";
import { isSoftCode } from "./codes.js";
import type { GradeEvent } from "../schema/gradeEvent.js";
import type { GradeDomain } from "./codes.js";

/** Default coaching ceiling before band reads "heavy" (pack maxSoftWeight null = UI-only). */
export const DEFAULT_SOFT_BAND_CEILING = 12;

/** Weights aligned to miami-a07-police-v0/rubric_soft.json */
export const SOFT_WEIGHTS: Record<SoftCode, number> = {
  SOFT_PRIORITY_LOW: 3,
  SOFT_RADIO_FORMAT: 2,
  SOFT_RADIO_WORDY: 1,
  SOFT_SLOW_KEY: 2,
  SOFT_DOWNGRADE_WHILE_ROLLING: 4,
  SOFT_NOTE_THIN: 3,
  SOFT_UNIT_SUBOPTIMAL_TYPE: 2,
  SOFT_STATUS_QUERY_LATE: 2,
  SOFT_LANGUAGE_NO_ATTEMPT: 3,
  SOFT_STACK_REASON_THIN: 2,
  SOFT_MAP_OVERTRUST: 2,
  SOFT_CALLBACK_NOT_LOGGED: 2,
  SOFT_BOLO_INCOMPLETE: 2,
  SOFT_TIMER_WARNING_IGNORED: 3,
  SOFT_CONCURRENCY_TUNNEL: 4,
};

export type SoftBandLabel = "clean" | "coaching" | "heavy";

export interface SoftBandScore {
  weight: number;
  ceiling: number;
  band: SoftBandLabel;
  markCount: number;
  byDomain: Partial<Record<GradeDomain, number>>;
  /** Human label for debrief stamp */
  label: string;
}

const DOMAIN_OF: Partial<Record<SoftCode, GradeDomain>> = {
  SOFT_PRIORITY_LOW: "PRI",
  SOFT_RADIO_FORMAT: "RAD",
  SOFT_RADIO_WORDY: "RAD",
  SOFT_SLOW_KEY: "TIM",
  SOFT_DOWNGRADE_WHILE_ROLLING: "PRI",
  SOFT_NOTE_THIN: "DOC",
  SOFT_UNIT_SUBOPTIMAL_TYPE: "ASN",
  SOFT_STATUS_QUERY_LATE: "STA",
  SOFT_LANGUAGE_NO_ATTEMPT: "CON",
  SOFT_STACK_REASON_THIN: "TIM",
  SOFT_MAP_OVERTRUST: "LOC",
  SOFT_CALLBACK_NOT_LOGGED: "DOC",
  SOFT_BOLO_INCOMPLETE: "RAD",
  SOFT_TIMER_WARNING_IGNORED: "TIM",
  SOFT_CONCURRENCY_TUNNEL: "MUL",
};

export function weightOfSoftCode(code: string): number {
  if (!isSoftCode(code)) return 0;
  return SOFT_WEIGHTS[code] ?? 1;
}

/**
 * Score soft marks for coaching product.
 * Does not flip checkride pass/fail (hard fails own that).
 * ceiling: null → use DEFAULT_SOFT_BAND_CEILING for band labels only.
 */
export function scoreSoftBand(
  softMarks: GradeEvent[],
  ceiling: number | null = DEFAULT_SOFT_BAND_CEILING
): SoftBandScore {
  const cap = ceiling ?? DEFAULT_SOFT_BAND_CEILING;
  let weight = 0;
  const byDomain: Partial<Record<GradeDomain, number>> = {};
  for (const m of softMarks) {
    if (m.severity !== "soft") continue;
    const w = weightOfSoftCode(m.code);
    weight += w;
    const domain = isSoftCode(m.code) ? DOMAIN_OF[m.code] : undefined;
    if (domain) {
      byDomain[domain] = (byDomain[domain] ?? 0) + w;
    }
  }

  let band: SoftBandLabel;
  if (weight === 0) band = "clean";
  else if (weight <= cap) band = "coaching";
  else band = "heavy";

  const label =
    band === "clean"
      ? "CLEAN COACHING"
      : band === "coaching"
        ? "COACHING NOTES"
        : "HEAVY COACHING";

  return {
    weight,
    ceiling: cap,
    band,
    markCount: softMarks.filter((m) => m.severity === "soft").length,
    byDomain,
    label,
  };
}
