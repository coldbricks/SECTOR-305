/**
 * RadioEvent — every TX/RX on the console channel log.
 * Caption is always required and non-empty (speech is a view over this).
 */

import { z } from "zod";
import {
  RadioDirectionSchema,
  RadioKindSchema,
  RadioStructuredSchema,
  RadioTemplateIdSchema,
} from "./common.js";

export const RadioEventSchema = z
  .object({
    id: z.string().min(1),
    atMs: z.number().nonnegative(),
    /** Primary talkgroup / channel id (e.g. SE305-PRI). */
    channelId: z.string().min(1),
    direction: RadioDirectionSchema,
    from: z.string().min(1),
    to: z.string().nullable(),
    kind: RadioKindSchema,
    /** Always present — empty string fails parse. */
    caption: z.string().min(1),
    incidentId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    requiresReadback: z.boolean(),
    readbackSatisfiedAtMs: z.number().nonnegative().nullable(),
    /** True when another TX stepped on this transmission (content, not mic). */
    steppedOn: z.boolean(),
    /** True when squelch/step-on left an incomplete message. */
    incomplete: z.boolean(),
    /** Template that produced this event, if any. */
    templateId: RadioTemplateIdSchema.optional(),
    /** Structured slots / freeform bag for grading. */
    structured: RadioStructuredSchema.optional(),
  })
  .strict();

export type RadioEvent = z.infer<typeof RadioEventSchema>;
