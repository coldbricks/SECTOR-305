/**
 * Scenario — checkride / watch / academy authoring document.
 */

import { z } from "zod";
import { GradeCodeZod } from "./gradeEvent.js";
import { IncidentSchema } from "./incident.js";
import { PlayerCommandSchema } from "./playerCommand.js";
import {
  RadioKindSchema,
  ScenarioKindSchema,
} from "./common.js";
import { UnitSchema } from "./unit.js";

export const ScenarioTimelineStartSchema = z
  .object({
    atMs: z.number().nonnegative(),
    type: z.literal("start"),
  })
  .strict();

export const ScenarioTimelineExpectNotSchema = z
  .object({
    atMs: z.number().nonnegative(),
    type: z.literal("expect_not"),
    gradeCode: GradeCodeZod,
  })
  .strict();

export const ScenarioTimelineExpectSchema = z
  .object({
    atMs: z.number().nonnegative(),
    type: z.literal("expect"),
    gradeCode: GradeCodeZod,
  })
  .strict();

export const ScenarioTimelineInjectNoteSchema = z
  .object({
    atMs: z.number().nonnegative(),
    type: z.literal("inject_note"),
    incidentId: z.string().min(1),
    text: z.string().min(1),
    author: z.enum(["call_taker", "system", "unit"]).default("call_taker"),
  })
  .strict();

export const ScenarioTimelineInjectRadioSchema = z
  .object({
    atMs: z.number().nonnegative(),
    type: z.literal("inject_radio"),
    from: z.string().min(1),
    caption: z.string().min(1),
    kind: RadioKindSchema.optional(),
    unitId: z.string().optional(),
    incidentId: z.string().optional(),
    steppedOn: z.boolean().optional(),
    incomplete: z.boolean().optional(),
  })
  .strict();

export const ScenarioTimelineInjectIncidentSchema = z
  .object({
    atMs: z.number().nonnegative(),
    type: z.literal("inject_incident"),
    incidentId: z.string().min(1),
  })
  .strict();

export const ScenarioTimelineCommandSchema = z
  .object({
    atMs: z.number().nonnegative(),
    type: z.literal("command"),
    cmd: PlayerCommandSchema,
  })
  .strict();

export const ScenarioTimelineEventSchema = z.discriminatedUnion("type", [
  ScenarioTimelineStartSchema,
  ScenarioTimelineExpectNotSchema,
  ScenarioTimelineExpectSchema,
  ScenarioTimelineInjectNoteSchema,
  ScenarioTimelineInjectRadioSchema,
  ScenarioTimelineInjectIncidentSchema,
  ScenarioTimelineCommandSchema,
]);

export type ScenarioTimelineEvent = z.infer<typeof ScenarioTimelineEventSchema>;

export const PassConditionsSchema = z
  .object({
    noHardFails: z.boolean().default(true),
    must: z.array(z.string()).optional(),
    maxSoftWeight: z.number().nonnegative().optional(),
    requiredSoftAbsent: z.array(GradeCodeZod).optional(),
    requiredSoftPresent: z.array(GradeCodeZod).optional(),
  })
  .strict();

export type PassConditions = z.infer<typeof PassConditionsSchema>;

export const FailDemoSchema = z
  .object({
    description: z.string().min(1),
    expectedHardFails: z.array(GradeCodeZod).min(1),
  })
  .strict();

export type FailDemo = z.infer<typeof FailDemoSchema>;

export const ScenarioSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    kind: ScenarioKindSchema,
    packId: z.string().min(1),
    seed: z.number().int(),
    title: z.string().min(1),
    description: z.string().optional(),
    adversarialTags: z.array(z.string()).default([]),
    contentNotes: z.array(z.string()).default([]),
    /** Inline units; omit to use pack/fixture base units. */
    units: z.array(UnitSchema).optional(),
    /** Seed incidents present at t=0 (and/or referenced by timeline). */
    incidents: z.array(IncidentSchema).optional(),
    timeline: z.array(ScenarioTimelineEventSchema).default([]),
    passConditions: PassConditionsSchema.default({ noHardFails: true }),
    /** Optional fail-fixture multiset of hard codes. */
    expectedHardFails: z.array(GradeCodeZod).optional(),
    failDemo: FailDemoSchema.optional(),
    consoleId: z.string().optional(),
  })
  .strict();

export type Scenario = z.infer<typeof ScenarioSchema>;
