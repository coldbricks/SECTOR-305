/**
 * Unit — sector unit board row (AVL board + assignment).
 */

import { z } from "zod";
import {
  LocationRefSchema,
  UnitStatusSchema,
  UnitTypeSchema,
} from "./common.js";

export const UnitSchema = z
  .object({
    id: z.string().min(1),
    callsign: z.string().min(1),
    agencyId: z.string().min(1),
    type: UnitTypeSchema,
    status: UnitStatusSchema,
    statusChangedAtMs: z.number().nonnegative(),
    /** Last-known location only — never live GPS truth. */
    location: LocationRefSchema,
    capabilities: z.array(z.string()),
    assignedIncidentId: z.string().min(1).nullable(),
    zoneId: z.string().min(1),
    /** Clock of last location/status location sample (map lag). */
    lastKnownAtMs: z.number().nonnegative(),
  })
  .strict();

export type Unit = z.infer<typeof UnitSchema>;
