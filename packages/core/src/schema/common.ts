/**
 * Shared Zod primitives for the SECTOR 305 domain spine.
 * All domain schemas import from here — no open string unions for closed doctrine sets.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Closed doctrine enums
// ---------------------------------------------------------------------------

export const PriorityCodeSchema = z.enum(["P0", "P1", "P2", "P3", "P4", "P5"]);
export type PriorityCode = z.infer<typeof PriorityCodeSchema>;

export const UnitStatusSchema = z.enum([
  "AVL", // available
  "DIS", // dispatched
  "ER", // en route
  "OS", // on scene
  "CLR", // clearing
  "OOS", // out of service
  "BSI", // busy self-initiated
  "EMR", // unit emergency
]);
export type UnitStatus = z.infer<typeof UnitStatusSchema>;

export const IncidentStatusSchema = z.enum([
  "PENDING",
  "DISPATCHED",
  "WORKING",
  "CLEARED",
  "CANCELLED",
  "HOLD",
  "LINKED_DUP",
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const LocationConfidenceSchema = z.enum([
  "verified",
  "partial",
  "unverified",
  "conflicting",
]);
export type LocationConfidence = z.infer<typeof LocationConfidenceSchema>;

export const GradeSeveritySchema = z.enum(["hard_fail", "soft", "note"]);
export type GradeSeverity = z.infer<typeof GradeSeveritySchema>;

export const CallerLanguageSchema = z.enum(["en", "es", "ht", "unknown"]);
export type CallerLanguage = z.infer<typeof CallerLanguageSchema>;

export const UnitTypeSchema = z.enum(["patrol", "supervisor", "traffic", "k9"]);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export const NoteAuthorSchema = z.enum(["player", "system", "unit", "call_taker"]);
export type NoteAuthor = z.infer<typeof NoteAuthorSchema>;

export const RadioDirectionSchema = z.enum(["dispatch_tx", "unit_tx", "system"]);
export type RadioDirection = z.infer<typeof RadioDirectionSchema>;

export const RadioKindSchema = z.enum([
  "DISPATCH",
  "ACK",
  "STATUS",
  "UPDATE",
  "EMERGENCY",
  "BOLO",
  "QUERY",
  "SYSTEM",
]);
export type RadioKind = z.infer<typeof RadioKindSchema>;

/** Closed incident flag set (Phase 0). */
export const IncidentFlagSchema = z.enum([
  "WEAPONS",
  "NEEDS_BACKUP",
  "IN_PROGRESS",
  "DOMESTIC",
  "SUPERVISOR_REQ",
  "BOLO",
  "LANGUAGE_ES",
  "LANGUAGE_HT",
  "SAFETY_HAZARD",
  "MENTAL_HEALTH",
  "TRAFFIC_HAZARD",
  "FIRE_EMS_NEEDED",
  "DUPLICATE",
  "HOLD_ACTIVE",
  "HANDOFF_NOTED",
]);
export type IncidentFlag = z.infer<typeof IncidentFlagSchema>;

/** Closed radio template slot names (Phase 0 pack). */
export const RadioSlotNameSchema = z.enum([
  "to_units",
  "from_console",
  "priority",
  "nature",
  "location",
  "cross_street",
  "safety",
  "cfs_number",
  "status",
  "direction",
  "description",
  "reason",
  "channel",
]);
export type RadioSlotName = z.infer<typeof RadioSlotNameSchema>;

/** Named radio templates required in Phase 0 pack. */
export const RadioTemplateIdSchema = z.enum([
  "DISPATCH_ASSIGN",
  "DISPATCH_ADD_UNIT",
  "DISPATCH_CANCEL",
  "DISPATCH_REASSIGN",
  "STATUS_QUERY",
  "STATUS_CORRECTION",
  "READBACK_PROMPT",
  "EMERGENCY_TRAFFIC_OPEN",
  "EMERGENCY_TRAFFIC_CLEAR",
  "BOLO",
  "WELFARE_CHECK_DISPATCH",
  "GENERAL_BROADCAST",
]);
export type RadioTemplateId = z.infer<typeof RadioTemplateIdSchema>;

export const ScenarioKindSchema = z.enum(["checkride", "watch", "academy"]);
export type ScenarioKind = z.infer<typeof ScenarioKindSchema>;

// ---------------------------------------------------------------------------
// Shared value objects
// ---------------------------------------------------------------------------

export const LocationRefSchema = z
  .object({
    freeform: z.string().min(1),
    block: z.string().optional(),
    street: z.string().optional(),
    crossStreet: z.string().optional(),
    zoneId: z.string().min(1),
    city: z.string().optional(),
    lat: z.number().finite().optional(),
    lon: z.number().finite().optional(),
  })
  .strict();
export type LocationRef = z.infer<typeof LocationRefSchema>;

/** Partial location for verify/patch commands — freeform/zone optional. */
export const LocationRefPartialSchema = z
  .object({
    freeform: z.string().min(1).optional(),
    block: z.string().optional(),
    street: z.string().optional(),
    crossStreet: z.string().optional(),
    zoneId: z.string().min(1).optional(),
    city: z.string().optional(),
    lat: z.number().finite().optional(),
    lon: z.number().finite().optional(),
  })
  .strict();
export type LocationRefPartial = z.infer<typeof LocationRefPartialSchema>;

export const CadNoteSchema = z
  .object({
    atMs: z.number().nonnegative(),
    author: NoteAuthorSchema,
    text: z.string().min(1),
  })
  .strict();
export type CadNote = z.infer<typeof CadNoteSchema>;

export const PriorityHistoryEntrySchema = z
  .object({
    atMs: z.number().nonnegative(),
    from: PriorityCodeSchema,
    to: PriorityCodeSchema,
    reason: z.string().optional(),
    author: NoteAuthorSchema,
  })
  .strict();
export type PriorityHistoryEntry = z.infer<typeof PriorityHistoryEntrySchema>;

/**
 * Truth knowable-schedule cue: when a truth facet becomes player-visible via inject.
 * Used by information-set grader (C10) — never shown as truth panel.
 * Distinct from doctrine/infoSet `KnowableCue` (runtime inject schedule).
 */
export const TruthKnowableCueSchema = z
  .object({
    atMs: z.number().nonnegative(),
    facet: z.enum([
      "location",
      "priority",
      "nature",
      "weapons",
      "inProgress",
      "requiresBackup",
      "callerLanguage",
      "note",
    ]),
    summary: z.string().min(1),
  })
  .strict();
export type TruthKnowableCue = z.infer<typeof TruthKnowableCueSchema>;

/** Structured radio slot bag (template fill). Values are strings after fill. */
export const RadioSlotsSchema = z.record(RadioSlotNameSchema, z.string());
export type RadioSlots = z.infer<typeof RadioSlotsSchema>;

/** Freeform structured payload allowed on radio events (legacy + freeform TX). */
export const RadioStructuredSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()])
);
export type RadioStructured = z.infer<typeof RadioStructuredSchema>;

export const ENGINE_VERSION = "0.1.0" as const;
