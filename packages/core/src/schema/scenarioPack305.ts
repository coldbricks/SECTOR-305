/**
 * .305 scenario pack envelope — ship/share format for one scenario.
 * Authoring stays folder-based; this is the single-file standard.
 *
 * schema: s305.scenario_pack.v1
 */
import { z } from "zod";
import { ScenarioKindSchema } from "./common.js";

export const SCENARIO_PACK_305_SCHEMA_ID = "s305.scenario_pack.v1" as const;
export const SCENARIO_PACK_305_EXT = ".305" as const;

/** Public face for library cards / Open dialog — stable fields only. */
export const ScenarioPack305ManifestSchema = z
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
    durationMs: z.number().nonnegative().optional(),
  })
  .strict();

export type ScenarioPack305Manifest = z.infer<
  typeof ScenarioPack305ManifestSchema
>;

/**
 * Full .305 file. `scenario` is the authoring document (scenario.json body).
 * Kept as a loose record + required keys so older mirrors still pack;
 * strict ScenarioSchema remains available for full inline scenarios.
 */
export const ScenarioPack305Schema = z
  .object({
    schema: z.literal(SCENARIO_PACK_305_SCHEMA_ID),
    format: z.literal("305"),
    packedAt: z.string().min(1).optional(),
    manifest: ScenarioPack305ManifestSchema,
    /** Authoring document — same shape as scenarios/<id>/scenario.json */
    scenario: z.record(z.string(), z.unknown()),
    /** EXPECTED.md or equivalent */
    notes: z.string().optional(),
    goldens: z
      .object({
        pass: z.record(z.string(), z.unknown()).optional(),
        fail: z.record(z.string(), z.unknown()).optional(),
      })
      .strict()
      .optional(),
    /** Future: relative path → base64 or sidecar map */
    assets: z.record(z.string(), z.unknown()).default({}),
  })
  .strict()
  .superRefine((pack, ctx) => {
    const s = pack.scenario;
    if (typeof s.id !== "string" || !s.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scenario.id required",
        path: ["scenario", "id"],
      });
    }
    if (s.id !== pack.manifest.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "manifest.id must equal scenario.id",
        path: ["manifest", "id"],
      });
    }
    if (typeof s.packId === "string" && s.packId !== pack.manifest.packId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "manifest.packId must equal scenario.packId",
        path: ["manifest", "packId"],
      });
    }
  });

export type ScenarioPack305 = z.infer<typeof ScenarioPack305Schema>;

/** Build manifest from a raw scenario.json object. */
export function manifestFromScenarioJson(
  raw: Record<string, unknown>
): ScenarioPack305Manifest {
  return ScenarioPack305ManifestSchema.parse({
    id: raw.id,
    version: raw.version ?? "0.0.0",
    kind: raw.kind,
    packId: raw.packId,
    seed: raw.seed,
    title: raw.title ?? raw.id,
    description: raw.description,
    adversarialTags: raw.adversarialTags ?? [],
    contentNotes: raw.contentNotes ?? [],
    durationMs: raw.durationMs,
  });
}
