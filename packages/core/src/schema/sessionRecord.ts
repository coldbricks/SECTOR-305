/**
 * SessionRecord — sacred replay artifact. Commands only; engine re-derives state.
 */

import { z } from "zod";
import { ENGINE_VERSION } from "./common.js";
import { PlayerCommandSchema } from "./playerCommand.js";

export const SessionCommandStepSchema = z
  .object({
    atMs: z.number().nonnegative(),
    cmd: PlayerCommandSchema,
  })
  .strict();

export type SessionCommandStep = z.infer<typeof SessionCommandStepSchema>;

export const SessionRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioId: z.string().min(1),
    packId: z.string().min(1),
    packVersion: z.string().min(1),
    seed: z.number().int(),
    engineVersion: z.string().min(1).default(ENGINE_VERSION),
    commands: z.array(SessionCommandStepSchema),
  })
  .strict();

export type SessionRecord = z.infer<typeof SessionRecordSchema>;
