/**
 * IncidentTruth — hidden from player UI. Grader + scenario runtime only.
 * Never serialize into default player snapshot (getSnapshot({ includeTruth: false })).
 */

import { z } from "zod";
import {
  CallerLanguageSchema,
  TruthKnowableCueSchema,
  LocationRefSchema,
  PriorityCodeSchema,
} from "./common.js";

export const IncidentTruthSchema = z
  .object({
    /** Ground-truth location (may differ from player CFS location). */
    actualLocation: LocationRefSchema,
    /** Ground-truth priority the scenario intends. */
    actualPriority: PriorityCodeSchema,
    /** Ground-truth nature code (pack natures). */
    actualNature: z.string().min(1),
    /** Weapons/threat present in truth. */
    weapons: z.boolean(),
    /** Crime/event still in progress at scenario truth. */
    inProgress: z.boolean(),
    /** High-risk backup requirement in truth. */
    requiresBackup: z.boolean(),
    /** Caller's actual language (may be knowable only later). */
    callerLanguage: CallerLanguageSchema,
    /** Scenario author notes for designer/grader — not player CAD. */
    notes: z.string().optional(),
    /**
     * Optional schedule of when truth facets become knowable to the player
     * via injects / CT notes. Information-set fairness (C10).
     */
    knowableSchedule: z.array(TruthKnowableCueSchema).optional(),
    /** Optional victim/suspect freeform description for BOLO-style injects. */
    subjectDescription: z.string().optional(),
    /** Optional secondary location truth (e.g. last-seen). */
    secondaryLocation: LocationRefSchema.optional(),
    /** Truth jurisdiction id (handoff scenarios). */
    actualJurisdictionId: z.string().optional(),
  })
  .strict();

export type IncidentTruth = z.infer<typeof IncidentTruthSchema>;
