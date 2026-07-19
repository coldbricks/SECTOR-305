import { describe, expect, it } from "vitest";
import { canTransition, isAssignable } from "../src/pack.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { baseUnitsA07 } from "../src/fixtures.js";
import { Runtime } from "../src/runtime.js";

describe("unit status graph", () => {
  const pack = loadDefaultPack();

  it("allows AVL → DIS → ER → OS → CLR → AVL", () => {
    expect(canTransition(pack, "AVL", "DIS")).toBe(true);
    expect(canTransition(pack, "DIS", "ER")).toBe(true);
    expect(canTransition(pack, "ER", "OS")).toBe(true);
    expect(canTransition(pack, "OS", "CLR")).toBe(true);
    expect(canTransition(pack, "CLR", "AVL")).toBe(true);
  });

  it("blocks AVL → OS skip", () => {
    expect(canTransition(pack, "AVL", "OS")).toBe(false);
  });

  it("only AVL is assignable by default", () => {
    expect(isAssignable(pack, "AVL")).toBe(true);
    expect(isAssignable(pack, "ER")).toBe(false);
    expect(isAssignable(pack, "OOS")).toBe(false);
  });

  it("runtime grades illegal OS skip", () => {
    const rt = new Runtime({
      pack,
      scenarioId: "t",
      seed: 1,
      units: baseUnitsA07(),
    });
    rt.apply({ type: "SetUnitStatus", unitId: "u-3a12", status: "OS" });
    expect(rt.state.gradeLog.some((g) => g.code === "FAIL_STATUS_ILLEGAL")).toBe(true);
    expect(rt.state.units["u-3a12"]!.status).toBe("AVL");
  });
});
