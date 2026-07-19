/**
 * PlayerCommand — closed Phase 0 command set (exactly 23 variants).
 * M03h · docs/PLAYER_COMMANDS.md · PHASE0_SCOPE_MANIFEST
 * Unknown discriminators are rejected at Zod parse; reducer uses never exhaustiveness.
 */

import { z } from "zod";
import {
  CallerLanguageSchema,
  IncidentFlagSchema,
  IncidentStatusSchema,
  LocationConfidenceSchema,
  LocationRefPartialSchema,
  LocationRefSchema,
  PriorityCodeSchema,
  RadioKindSchema,
  RadioSlotsSchema,
  RadioStructuredSchema,
  RadioTemplateIdSchema,
  UnitStatusSchema,
} from "./common.js";
import { IncidentTruthSchema } from "./incidentTruth.js";

// ---------------------------------------------------------------------------
// 1. VerifyLocation
// ---------------------------------------------------------------------------

export const VerifyLocationCmdSchema = z
  .object({
    type: z.literal("VerifyLocation"),
    incidentId: z.string().min(1),
    confidence: LocationConfidenceSchema,
    location: LocationRefPartialSchema.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 2. SetPriority
// ---------------------------------------------------------------------------

export const SetPriorityCmdSchema = z
  .object({
    type: z.literal("SetPriority"),
    incidentId: z.string().min(1),
    priority: PriorityCodeSchema,
    /** Required for downgrade path grading (SOFT_DOWNGRADE / undercode). */
    reason: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 3. SetNature
// ---------------------------------------------------------------------------

export const SetNatureCmdSchema = z
  .object({
    type: z.literal("SetNature"),
    incidentId: z.string().min(1),
    natureCode: z.string().min(1),
    natureText: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 4. AddNote
// ---------------------------------------------------------------------------

export const AddNoteCmdSchema = z
  .object({
    type: z.literal("AddNote"),
    incidentId: z.string().min(1),
    text: z.string().min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// 5. SetFlag
// ---------------------------------------------------------------------------

export const SetFlagCmdSchema = z
  .object({
    type: z.literal("SetFlag"),
    incidentId: z.string().min(1),
    flag: IncidentFlagSchema,
    value: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 6. DispatchUnits
// ---------------------------------------------------------------------------

export const DispatchUnitsCmdSchema = z
  .object({
    type: z.literal("DispatchUnits"),
    incidentId: z.string().min(1),
    unitIds: z.array(z.string().min(1)).min(1),
    /** Optional freeform caption; pack template used when omitted. */
    radioCaption: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 7. AddUnitToIncident
// ---------------------------------------------------------------------------

export const AddUnitToIncidentCmdSchema = z
  .object({
    type: z.literal("AddUnitToIncident"),
    incidentId: z.string().min(1),
    unitId: z.string().min(1),
    radioCaption: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 8. ReleaseUnit
// ---------------------------------------------------------------------------

export const ReleaseUnitCmdSchema = z
  .object({
    type: z.literal("ReleaseUnit"),
    unitId: z.string().min(1),
    /** Optional note why released / divert. */
    reason: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 9. SetUnitStatus
// ---------------------------------------------------------------------------

export const SetUnitStatusCmdSchema = z
  .object({
    type: z.literal("SetUnitStatus"),
    unitId: z.string().min(1),
    status: UnitStatusSchema,
    note: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 10. RadioTx — template + slots
// ---------------------------------------------------------------------------

export const RadioTxCmdSchema = z
  .object({
    type: z.literal("RadioTx"),
    templateId: RadioTemplateIdSchema,
    slots: RadioSlotsSchema,
    channelId: z.string().min(1).optional(),
    incidentId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    requiresReadback: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 11. RadioTxFreeform — caption + kind (still structured-grade after parse)
// ---------------------------------------------------------------------------

export const RadioTxFreeformCmdSchema = z
  .object({
    type: z.literal("RadioTxFreeform"),
    channelId: z.string().min(1).optional(),
    to: z.string().min(1),
    kind: RadioKindSchema,
    caption: z.string().min(1),
    incidentId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    requiresReadback: z.boolean().optional(),
    structured: RadioStructuredSchema.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 12. AckReadback
// ---------------------------------------------------------------------------

export const AckReadbackCmdSchema = z
  .object({
    type: z.literal("AckReadback"),
    radioEventId: z.string().min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// 13. UnitRadioRx — scenario / NPC unit TX
// ---------------------------------------------------------------------------

export const UnitRadioRxCmdSchema = z
  .object({
    type: z.literal("UnitRadioRx"),
    unitId: z.string().min(1),
    caption: z.string().min(1),
    kind: RadioKindSchema.optional(),
    incidentId: z.string().min(1).optional(),
    satisfiesReadbackFor: z.string().min(1).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 14. ClearIncident
// ---------------------------------------------------------------------------

export const ClearIncidentCmdSchema = z
  .object({
    type: z.literal("ClearIncident"),
    incidentId: z.string().min(1),
    disposition: z.string().min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// 15. CancelIncident
// ---------------------------------------------------------------------------

export const CancelIncidentCmdSchema = z
  .object({
    type: z.literal("CancelIncident"),
    incidentId: z.string().min(1),
    disposition: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 16. HoldIncident
// ---------------------------------------------------------------------------

export const HoldIncidentCmdSchema = z
  .object({
    type: z.literal("HoldIncident"),
    incidentId: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// 17. RequestStatusCheck
// ---------------------------------------------------------------------------

export const RequestStatusCheckCmdSchema = z
  .object({
    type: z.literal("RequestStatusCheck"),
    unitId: z.string().min(1),
    incidentId: z.string().min(1).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 18. Advance — sim clock
// ---------------------------------------------------------------------------

export const AdvanceCmdSchema = z
  .object({
    type: z.literal("Advance"),
    ms: z.number().positive(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 19. InjectIncident — scenario runtime / debug
// ---------------------------------------------------------------------------

export const InjectIncidentBodySchema = z
  .object({
    id: z.string().min(1),
    cfsNumber: z.string().min(1),
    priority: PriorityCodeSchema,
    natureCode: z.string().min(1),
    natureText: z.string().min(1),
    location: LocationRefSchema,
    locationConfidence: LocationConfidenceSchema,
    jurisdictionId: z.string().min(1),
    createdAtMs: z.number().nonnegative(),
    receivedAtMs: z.number().nonnegative(),
    enteredAtMs: z.number().nonnegative().nullable().optional(),
    callerLanguage: CallerLanguageSchema,
    flags: z.array(IncidentFlagSchema).optional(),
    status: IncidentStatusSchema.optional(),
    truth: IncidentTruthSchema,
  })
  .strict();

export const InjectIncidentCmdSchema = z
  .object({
    type: z.literal("InjectIncident"),
    incident: InjectIncidentBodySchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// 20. InjectRadio — step-on, incomplete, NPC chatter
// ---------------------------------------------------------------------------

export const InjectRadioCmdSchema = z
  .object({
    type: z.literal("InjectRadio"),
    channelId: z.string().min(1).optional(),
    direction: z.enum(["dispatch_tx", "unit_tx", "system"]).optional(),
    from: z.string().min(1),
    to: z.string().nullable().optional(),
    kind: RadioKindSchema.optional(),
    caption: z.string().min(1),
    incidentId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    steppedOn: z.boolean().optional(),
    incomplete: z.boolean().optional(),
    requiresReadback: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 21. SetChannelEmergency
// ---------------------------------------------------------------------------

export const SetChannelEmergencyCmdSchema = z
  .object({
    type: z.literal("SetChannelEmergency"),
    active: z.boolean(),
    reason: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 22. LinkDuplicate
// ---------------------------------------------------------------------------

export const LinkDuplicateCmdSchema = z
  .object({
    type: z.literal("LinkDuplicate"),
    /** Duplicate / secondary CFS. */
    incidentId: z.string().min(1),
    /** Surviving primary CFS. */
    primaryIncidentId: z.string().min(1),
    reason: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 23. NoOp
// ---------------------------------------------------------------------------

export const NoOpCmdSchema = z
  .object({
    type: z.literal("NoOp"),
    reason: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Discriminated union — closed set of 23
// ---------------------------------------------------------------------------

export const PlayerCommandSchema = z.discriminatedUnion("type", [
  VerifyLocationCmdSchema,
  SetPriorityCmdSchema,
  SetNatureCmdSchema,
  AddNoteCmdSchema,
  SetFlagCmdSchema,
  DispatchUnitsCmdSchema,
  AddUnitToIncidentCmdSchema,
  ReleaseUnitCmdSchema,
  SetUnitStatusCmdSchema,
  RadioTxCmdSchema,
  RadioTxFreeformCmdSchema,
  AckReadbackCmdSchema,
  UnitRadioRxCmdSchema,
  ClearIncidentCmdSchema,
  CancelIncidentCmdSchema,
  HoldIncidentCmdSchema,
  RequestStatusCheckCmdSchema,
  AdvanceCmdSchema,
  InjectIncidentCmdSchema,
  InjectRadioCmdSchema,
  SetChannelEmergencyCmdSchema,
  LinkDuplicateCmdSchema,
  NoOpCmdSchema,
]);

export type PlayerCommand = z.infer<typeof PlayerCommandSchema>;

/** Ordered list of command type discriminators (must stay length 23). */
export const PLAYER_COMMAND_TYPES = [
  "VerifyLocation",
  "SetPriority",
  "SetNature",
  "AddNote",
  "SetFlag",
  "DispatchUnits",
  "AddUnitToIncident",
  "ReleaseUnit",
  "SetUnitStatus",
  "RadioTx",
  "RadioTxFreeform",
  "AckReadback",
  "UnitRadioRx",
  "ClearIncident",
  "CancelIncident",
  "HoldIncident",
  "RequestStatusCheck",
  "Advance",
  "InjectIncident",
  "InjectRadio",
  "SetChannelEmergency",
  "LinkDuplicate",
  "NoOp",
] as const;

export type PlayerCommandType = (typeof PLAYER_COMMAND_TYPES)[number];

export const PLAYER_COMMAND_COUNT = PLAYER_COMMAND_TYPES.length; // 23

export type VerifyLocationCmd = z.infer<typeof VerifyLocationCmdSchema>;
export type SetPriorityCmd = z.infer<typeof SetPriorityCmdSchema>;
export type SetNatureCmd = z.infer<typeof SetNatureCmdSchema>;
export type AddNoteCmd = z.infer<typeof AddNoteCmdSchema>;
export type SetFlagCmd = z.infer<typeof SetFlagCmdSchema>;
export type DispatchUnitsCmd = z.infer<typeof DispatchUnitsCmdSchema>;
export type AddUnitToIncidentCmd = z.infer<typeof AddUnitToIncidentCmdSchema>;
export type ReleaseUnitCmd = z.infer<typeof ReleaseUnitCmdSchema>;
export type SetUnitStatusCmd = z.infer<typeof SetUnitStatusCmdSchema>;
export type RadioTxCmd = z.infer<typeof RadioTxCmdSchema>;
export type RadioTxFreeformCmd = z.infer<typeof RadioTxFreeformCmdSchema>;
export type AckReadbackCmd = z.infer<typeof AckReadbackCmdSchema>;
export type UnitRadioRxCmd = z.infer<typeof UnitRadioRxCmdSchema>;
export type ClearIncidentCmd = z.infer<typeof ClearIncidentCmdSchema>;
export type CancelIncidentCmd = z.infer<typeof CancelIncidentCmdSchema>;
export type HoldIncidentCmd = z.infer<typeof HoldIncidentCmdSchema>;
export type RequestStatusCheckCmd = z.infer<typeof RequestStatusCheckCmdSchema>;
export type AdvanceCmd = z.infer<typeof AdvanceCmdSchema>;
export type InjectIncidentCmd = z.infer<typeof InjectIncidentCmdSchema>;
export type InjectRadioCmd = z.infer<typeof InjectRadioCmdSchema>;
export type SetChannelEmergencyCmd = z.infer<typeof SetChannelEmergencyCmdSchema>;
export type LinkDuplicateCmd = z.infer<typeof LinkDuplicateCmdSchema>;
export type NoOpCmd = z.infer<typeof NoOpCmdSchema>;
