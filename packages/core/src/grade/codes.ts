/**
 * Closed Phase 0 grade vocabulary — FAIL_ hard codes + SOFT_ coaching marks.
 * Source of truth: docs/PHASE0_SCOPE_MANIFEST.md M02a / M02b · docs/RUBRIC.md
 * Every code is a stable string used by grader, debrief, goldens, and CI.
 */

// ---------------------------------------------------------------------------
// Hard fails (any one = checkride fail)
// ---------------------------------------------------------------------------

export const FAIL_CODES = [
  "FAIL_NO_VERIFY",
  "FAIL_WRONG_LOCATION",
  "FAIL_PRIORITY_UNDERCODE",
  "FAIL_PRIORITY_AGING",
  "FAIL_HOLD_HIGH_PRIORITY",
  "FAIL_NO_BACKUP",
  "FAIL_UNIT_NOT_ASSIGNABLE",
  "FAIL_UNIT_WRONG_TYPE",
  "FAIL_STATUS_ILLEGAL",
  "FAIL_STATUS_DIRTY_CLOSE",
  "FAIL_STATUS_STALE",
  "FAIL_NO_READBACK",
  "FAIL_RADIO_FORMAT",
  "FAIL_RADIO_EMERGENCY_TRAFFIC",
  "FAIL_SAFETY_NOT_AIRED",
  "FAIL_NO_DISPOSITION",
  "FAIL_NARRATIVE_MISSING_CRITICAL",
  "FAIL_JURISDICTION",
  "FAIL_DIVERT_WITHOUT_LOG",
  "FAIL_CHANNEL_ABANDON",
  "FAIL_INFOSET_VIOLATION",
  "FAIL_READBACK_WRONG",
  "FAIL_RECLASS_NO_RADIO",
  "FAIL_DOUBLE_ASSIGN_CONFLICT",
] as const;

export type FailCode = (typeof FAIL_CODES)[number];

// ---------------------------------------------------------------------------
// Soft marks (coaching; never flip checkride alone unless pack maxSoftWeight)
// ---------------------------------------------------------------------------

export const SOFT_CODES = [
  "SOFT_PRIORITY_LOW",
  "SOFT_RADIO_FORMAT",
  "SOFT_RADIO_WORDY",
  "SOFT_SLOW_KEY",
  "SOFT_DOWNGRADE_WHILE_ROLLING",
  "SOFT_NOTE_THIN",
  "SOFT_UNIT_SUBOPTIMAL_TYPE",
  "SOFT_STATUS_QUERY_LATE",
  "SOFT_LANGUAGE_NO_ATTEMPT",
  "SOFT_STACK_REASON_THIN",
  "SOFT_MAP_OVERTRUST",
  "SOFT_CALLBACK_NOT_LOGGED",
  "SOFT_BOLO_INCOMPLETE",
  "SOFT_TIMER_WARNING_IGNORED",
  "SOFT_CONCURRENCY_TUNNEL",
] as const;

export type SoftCode = (typeof SOFT_CODES)[number];

/** Union of every grade code the engine may emit. */
export const GRADE_CODES = [...FAIL_CODES, ...SOFT_CODES] as const;

export type GradeCode = (typeof GRADE_CODES)[number];

export function isFailCode(code: string): code is FailCode {
  return (FAIL_CODES as readonly string[]).includes(code);
}

export function isSoftCode(code: string): code is SoftCode {
  return (SOFT_CODES as readonly string[]).includes(code);
}

export function isGradeCode(code: string): code is GradeCode {
  return (GRADE_CODES as readonly string[]).includes(code);
}

/** Aliases used by multiset / tests / older modules */
export const HARD_FAIL_CODES = FAIL_CODES;
export type HardFailCode = FailCode;
export const SOFT_MARK_CODES = SOFT_CODES;
export type SoftMarkCode = SoftCode;
export const isHardFailCode = isFailCode;

export function hardFailMultiset(codes: string[]): string {
  return codes
    .filter(isFailCode)
    .slice()
    .sort()
    .join("|");
}

export const DEBRIEF_DISCLAIMER =
  "S305 training evaluation only. Not a real telecommunicator certification. Fictional PSAP / jurisdiction. Standards-aligned concepts for education — not official APCO/NENA/IAED certification. Completing tracks grants no real credential.";

/** Domain tags used on debrief form sections and rubric rows. */
export const GRADE_DOMAINS = [
  "LOC",
  "PRI",
  "ASN",
  "STA",
  "RAD",
  "TIM",
  "DOC",
  "SAF",
  "MUL",
  "CON",
  "SYS",
] as const;

export type GradeDomain = (typeof GRADE_DOMAINS)[number];

/** Primary domain per FAIL_ code (Table A partial — full tables in RUBRIC.md). */
export const FAIL_CODE_DOMAIN: Record<FailCode, GradeDomain> = {
  FAIL_NO_VERIFY: "LOC",
  FAIL_WRONG_LOCATION: "LOC",
  FAIL_PRIORITY_UNDERCODE: "PRI",
  FAIL_PRIORITY_AGING: "TIM",
  FAIL_HOLD_HIGH_PRIORITY: "TIM",
  FAIL_NO_BACKUP: "ASN",
  FAIL_UNIT_NOT_ASSIGNABLE: "ASN",
  FAIL_UNIT_WRONG_TYPE: "ASN",
  FAIL_STATUS_ILLEGAL: "STA",
  FAIL_STATUS_DIRTY_CLOSE: "STA",
  FAIL_STATUS_STALE: "STA",
  FAIL_NO_READBACK: "RAD",
  FAIL_RADIO_FORMAT: "RAD",
  FAIL_RADIO_EMERGENCY_TRAFFIC: "RAD",
  FAIL_SAFETY_NOT_AIRED: "SAF",
  FAIL_NO_DISPOSITION: "DOC",
  FAIL_NARRATIVE_MISSING_CRITICAL: "DOC",
  FAIL_JURISDICTION: "ASN",
  FAIL_DIVERT_WITHOUT_LOG: "ASN",
  FAIL_CHANNEL_ABANDON: "MUL",
  FAIL_INFOSET_VIOLATION: "CON",
  FAIL_READBACK_WRONG: "RAD",
  FAIL_RECLASS_NO_RADIO: "RAD",
  FAIL_DOUBLE_ASSIGN_CONFLICT: "ASN",
};

/** Primary domain per SOFT_ code. */
export const SOFT_CODE_DOMAIN: Record<SoftCode, GradeDomain> = {
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
