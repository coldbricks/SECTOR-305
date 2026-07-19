import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDefaultPack } from "../src/loadPack.js";

const packDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "packs",
  "miami-a07-police-v0"
);

describe("M09 pack validate", () => {
  it("loads default pack via split files", () => {
    const pack = loadDefaultPack();
    expect(pack.id).toBe("miami-a07-police-v0");
    expect(pack.priorities.length).toBe(6);
    expect(pack.unitStatuses.length).toBe(8);
    expect(pack.natures.length).toBeGreaterThanOrEqual(12);
    expect(pack.zones.length).toBeGreaterThanOrEqual(5);
    expect(pack.rubric.length).toBeGreaterThanOrEqual(20);
  });

  it("unit_statuses.json reports 64 cells", () => {
    const us = JSON.parse(
      readFileSync(join(packDir, "unit_statuses.json"), "utf8")
    ) as { cellCount?: number; matrixCellCount?: number; matrix: unknown[] };
    const count = us.matrixCellCount ?? us.cellCount ?? us.matrix?.length;
    expect(count).toBe(64);
    expect(us.matrix.length).toBe(64);
  });

  it("rubric hard codes include sacred three", () => {
    const rub = JSON.parse(readFileSync(join(packDir, "rubric.json"), "utf8")) as {
      hard?: { code: string }[];
      rules?: { code: string }[];
    };
    const list = rub.hard ?? rub.rules ?? [];
    const codes = new Set(list.map((h) => h.code));
    expect(codes.has("FAIL_NO_VERIFY")).toBe(true);
    expect(codes.has("FAIL_PRIORITY_UNDERCODE")).toBe(true);
    expect(codes.has("FAIL_NO_READBACK")).toBe(true);
  });

  it("soft rubric has >= 15", () => {
    const soft = JSON.parse(
      readFileSync(join(packDir, "rubric_soft.json"), "utf8")
    ) as { soft?: unknown[]; rules?: unknown[] };
    const list = soft.soft ?? soft.rules ?? [];
    expect(list.length).toBeGreaterThanOrEqual(15);
  });
});
