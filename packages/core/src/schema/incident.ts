/**
 * CFS / Incident — player-visible CAD record + embedded truth for runtime/grader.
 */

import { z } from "zod";
import {
  CadNoteSchema,
  CallerLanguageSchema,
  IncidentFlagSchema,
  IncidentStatusSchema,
  LocationConfidenceSchema,
  LocationRefSchema,
  PriorityCodeSchema,
  PriorityHistoryEntrySchema,
} from "./common.js";
import { IncidentTruthSchema } from "./incidentTruth.js";

export const IncidentSchema = z
  .object({
    id: z.string().min(1),
    cfsNumber: z.string().min(1),
    priority: PriorityCodeSchema,
    natureCode: z.string().min(1),
    natureText: z.string().min(1),
    location: LocationRefSchema,
    locationConfidence: LocationConfidenceSchema,
    jurisdictionId: z.string().min(1),
    status: IncidentStatusSchema,
    /** Sim-clock create (authoring). */
    createdAtMs: z.number().nonnegative(),
    /** Liability: when call entered queue (received). */
    receivedAtMs: z.number().nonnegative(),
    /** Liability: when CAD entry completed enough to act. */
    enteredAtMs: z.number().nonnegative().nullable(),
    /** Liability: each priority change. */
    priorityHistory: z.array(PriorityHistoryEntrySchema).default([]),
    /** Liability: first unit DIS assign. */
    firstDispatchAtMs: z.number().nonnegative().nullable(),
    /** Liability: first unit ER. */
    firstEnRouteAtMs: z.number().nonnegative().nullable(),
    /** Liability: first unit OS. */
    firstOnSceneAtMs: z.number().nonnegative().nullable(),
    /** Liability: last player/system material update. */
    lastUpdateAtMs: z.number().nonnegative().nullable(),
    /** Liability: clear/cancel stamp. */
    clearedAtMs: z.number().nonnegative().nullable(),
    assignedUnitIds: z.array(z.string().min(1)),
    primaryUnitId: z.string().min(1).nullable(),
    callerLanguage: CallerLanguageSchema,
    /** Closed flag set — use SetFlag command only. */
    flags: z.array(IncidentFlagSchema),
    /** Append-only narrative. */
    notes: z.array(CadNoteSchema),
    /** Required non-null when status is CLEARED (post-condition). */
    disposition: z.string().nullable(),
    /** Linked primary CFS id when status LINKED_DUP. */
    linkedIncidentId: z.string().min(1).nullable().optional(),
    /** Hidden truth — strip for player snapshot. */
    truth: IncidentTruthSchema,
  })
  .strict();

export type Incident = z.infer<typeof IncidentSchema>;

/**
 * Post-condition helper: cleared CFS must carry disposition.
 * Not a Zod refine on the live object (disposition set on the clear edge).
 */
export function assertClearedHasDisposition(inc: Incident): void {
  if (inc.status === "CLEARED" && (inc.disposition === null || inc.disposition === "")) {
    throw new Error(`Incident ${inc.id} CLEARED without disposition`);
  }
}
