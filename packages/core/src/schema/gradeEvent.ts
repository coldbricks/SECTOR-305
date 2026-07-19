/**
 * GradeEvent — one hard fail, soft mark, or note on the evaluation timeline.
 */

import { z } from "zod";
import { GRADE_CODES, type GradeCode } from "../grade/codes.js";
import { GradeSeveritySchema } from "./common.js";

const gradeCodeTuple = GRADE_CODES as unknown as [GradeCode, ...GradeCode[]];
export const GradeCodeZod = z.enum(gradeCodeTuple);

export const GradeEvidenceSchema = z
  .object({
    expected: z.string().optional(),
    actual: z.string().optional(),
    ruleRef: z.string().min(1),
    commandId: z.string().optional(),
  })
  .strict();

export type GradeEvidence = z.infer<typeof GradeEvidenceSchema>;

export const GradeEventSchema = z
  .object({
    id: z.string().min(1),
    atMs: z.number().nonnegative(),
    severity: GradeSeveritySchema,
    code: GradeCodeZod,
    rubricId: z.string().min(1),
    incidentId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    message: z.string().min(1),
    evidence: GradeEvidenceSchema,
  })
  .strict();

export type GradeEvent = z.infer<typeof GradeEventSchema>;
