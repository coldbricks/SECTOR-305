import {
  FAIL_CODE_DOMAIN,
  GRADE_DOMAINS,
  SOFT_CODE_DOMAIN,
  isFailCode,
  isSoftCode,
} from "./grade/codes.js";
import type { Debrief, GradeCode, GradeDomain } from "./types.js";

export const MASTERY_PROFILE_VERSION = 1 as const;

export type MasteryFocusMode = "baseline" | "correction" | "retention" | "standard";

export interface MasteryFocus {
  mode: MasteryFocusMode;
  domain: GradeDomain | null;
  label: string;
  title: string;
  brief: string;
  sourceCode: GradeCode | null;
}

export interface MasteryDomainRecord {
  hardFindings: number;
  softFindings: number;
  lastCode: GradeCode | null;
  lastObservedAtIso: string | null;
}

export interface MasteryWatchSummary {
  id: string;
  scenarioId: string;
  seed: number;
  passed: boolean;
  hardFindings: number;
  softFindings: number;
  completedAtIso: string;
}

export interface MasteryProfile {
  schemaVersion: typeof MASTERY_PROFILE_VERSION;
  watchesCompleted: number;
  cleanWatches: number;
  completedWatchIds: string[];
  domains: Record<GradeDomain, MasteryDomainRecord>;
  lastWatch: MasteryWatchSummary | null;
  focus: MasteryFocus;
}

type DomainCopy = {
  label: string;
  correctionTitle: string;
  retentionTitle: string;
  brief: string;
};

const DOMAIN_COPY: Record<GradeDomain, DomainCopy> = {
  LOC: {
    label: "LOCATION",
    correctionTitle: "Verify before you launch",
    retentionTitle: "Prove the location discipline holds",
    brief: "Resolve confidence, block, street, and jurisdiction before committing high-acuity units.",
  },
  PRI: {
    label: "PRIORITY",
    correctionTitle: "Match acuity before dispatch",
    retentionTitle: "Prove the priority read holds",
    brief: "Let the knowable cues drive classification; never let convenience undercode the call.",
  },
  ASN: {
    label: "ASSIGNMENT",
    correctionTitle: "Build the response before you key",
    retentionTitle: "Prove the assignment discipline holds",
    brief: "Confirm assignability, type, jurisdiction, and backup depth before the first transmission.",
  },
  STA: {
    label: "STATUS",
    correctionTitle: "Keep every unit state truthful",
    retentionTitle: "Prove the status discipline holds",
    brief: "Use legal transitions and close every unit cleanly so the board never lies to the next call.",
  },
  RAD: {
    label: "RADIO",
    correctionTitle: "Close the radio loop",
    retentionTitle: "Prove the radio discipline holds",
    brief: "Transmit the complete assignment, protect airtime, and obtain the required readback.",
  },
  TIM: {
    label: "TEMPO",
    correctionTitle: "Control the stack before it controls you",
    retentionTitle: "Prove the tempo holds under load",
    brief: "Watch aging, key decisive actions promptly, and keep urgent work ahead of cosmetic work.",
  },
  DOC: {
    label: "DOCUMENTATION",
    correctionTitle: "Leave a defensible record",
    retentionTitle: "Prove the documentation holds",
    brief: "Capture critical narrative, callbacks, and disposition so the record survives the handoff.",
  },
  SAF: {
    label: "SAFETY",
    correctionTitle: "Air the threat every time",
    retentionTitle: "Prove the safety broadcast holds",
    brief: "Move known weapons and hazards from CAD truth onto the radio before units arrive blind.",
  },
  MUL: {
    label: "MULTI-CALL",
    correctionTitle: "Keep the whole sector in view",
    retentionTitle: "Prove the sector scan holds",
    brief: "Maintain channel and queue awareness while the primary incident demands attention.",
  },
  CON: {
    label: "CONSTRAINTS",
    correctionTitle: "Act only on knowable information",
    retentionTitle: "Prove the information discipline holds",
    brief: "Separate what the operator knows now from what the hidden scenario truth knows later.",
  },
  SYS: {
    label: "SYSTEM",
    correctionTitle: "Stabilize the instrument path",
    retentionTitle: "Prove the instrument path holds",
    brief: "Keep the console state and authored scenario path internally consistent throughout the watch.",
  },
};

function emptyDomains(): Record<GradeDomain, MasteryDomainRecord> {
  return Object.fromEntries(
    GRADE_DOMAINS.map((domain) => [
      domain,
      { hardFindings: 0, softFindings: 0, lastCode: null, lastObservedAtIso: null },
    ])
  ) as Record<GradeDomain, MasteryDomainRecord>;
}

function baselineFocus(): MasteryFocus {
  return {
    mode: "baseline",
    domain: null,
    label: "BASELINE",
    title: "Establish the baseline",
    brief: "Run the fixed Ocean checkride cleanly. The console will shape the next watch from observed doctrine—not points.",
    sourceCode: null,
  };
}

function gradeDomain(code: GradeCode): GradeDomain {
  if (isFailCode(code)) return FAIL_CODE_DOMAIN[code];
  if (isSoftCode(code)) return SOFT_CODE_DOMAIN[code];
  return "SYS";
}

function deriveFocus(profile: Omit<MasteryProfile, "focus">): MasteryFocus {
  let strongest: GradeDomain | null = null;
  let strongestWeight = 0;

  for (const domain of GRADE_DOMAINS) {
    const record = profile.domains[domain];
    const weight = record.hardFindings * 4 + record.softFindings;
    if (weight > strongestWeight) {
      strongest = domain;
      strongestWeight = weight;
    }
  }

  if (!strongest) {
    if (profile.watchesCompleted === 0) return baselineFocus();
    return {
      mode: "standard",
      domain: null,
      label: "STANDARD",
      title: "Hold the standard under pressure",
      brief: "Repeat the real geography, radio procedure, and unit workflow with less hesitation and cleaner air.",
      sourceCode: null,
    };
  }

  const copy = DOMAIN_COPY[strongest];
  const retention = profile.lastWatch?.passed === true;
  return {
    mode: retention ? "retention" : "correction",
    domain: strongest,
    label: copy.label,
    title: retention ? copy.retentionTitle : copy.correctionTitle,
    brief: copy.brief,
    sourceCode: profile.domains[strongest].lastCode,
  };
}

export function createMasteryProfile(): MasteryProfile {
  return {
    schemaVersion: MASTERY_PROFILE_VERSION,
    watchesCompleted: 0,
    cleanWatches: 0,
    completedWatchIds: [],
    domains: emptyDomains(),
    lastWatch: null,
    focus: baselineFocus(),
  };
}

export function recordMasteryWatch(
  current: MasteryProfile,
  debrief: Debrief,
  watchId: string,
  completedAtIso: string
): MasteryProfile {
  if (current.completedWatchIds.includes(watchId)) return current;

  const domains = Object.fromEntries(
    GRADE_DOMAINS.map((domain) => [domain, { ...current.domains[domain] }])
  ) as Record<GradeDomain, MasteryDomainRecord>;

  for (const finding of [...debrief.hardFails, ...debrief.softMarks]) {
    const domain = gradeDomain(finding.code);
    const record = domains[domain];
    if (finding.severity === "hard_fail") record.hardFindings += 1;
    if (finding.severity === "soft") record.softFindings += 1;
    record.lastCode = finding.code;
    record.lastObservedAtIso = completedAtIso;
  }

  const withoutFocus: Omit<MasteryProfile, "focus"> = {
    schemaVersion: MASTERY_PROFILE_VERSION,
    watchesCompleted: current.watchesCompleted + 1,
    cleanWatches: current.cleanWatches + (debrief.passed ? 1 : 0),
    completedWatchIds: [...current.completedWatchIds, watchId].slice(-64),
    domains,
    lastWatch: {
      id: watchId,
      scenarioId: debrief.scenarioId,
      seed: debrief.seed,
      passed: debrief.passed,
      hardFindings: debrief.hardFails.length,
      softFindings: debrief.softMarks.length,
      completedAtIso,
    },
  };

  return { ...withoutFocus, focus: deriveFocus(withoutFocus) };
}

export function coerceMasteryProfile(value: unknown): MasteryProfile {
  if (!value || typeof value !== "object") return createMasteryProfile();
  const candidate = value as Partial<MasteryProfile>;
  if (
    candidate.schemaVersion !== MASTERY_PROFILE_VERSION ||
    !Number.isInteger(candidate.watchesCompleted) ||
    !Number.isInteger(candidate.cleanWatches) ||
    !Array.isArray(candidate.completedWatchIds) ||
    !candidate.domains ||
    typeof candidate.domains !== "object"
  ) {
    return createMasteryProfile();
  }

  for (const domain of GRADE_DOMAINS) {
    const record = candidate.domains[domain];
    if (
      !record ||
      !Number.isInteger(record.hardFindings) ||
      !Number.isInteger(record.softFindings)
    ) {
      return createMasteryProfile();
    }
  }

  const withoutFocus: Omit<MasteryProfile, "focus"> = {
    schemaVersion: MASTERY_PROFILE_VERSION,
    watchesCompleted: Math.max(0, candidate.watchesCompleted as number),
    cleanWatches: Math.max(0, candidate.cleanWatches as number),
    completedWatchIds: candidate.completedWatchIds.filter(
      (id): id is string => typeof id === "string"
    ).slice(-64),
    domains: Object.fromEntries(
      GRADE_DOMAINS.map((domain) => [domain, { ...candidate.domains![domain] }])
    ) as Record<GradeDomain, MasteryDomainRecord>,
    lastWatch: candidate.lastWatch ?? null,
  };

  return { ...withoutFocus, focus: deriveFocus(withoutFocus) };
}
