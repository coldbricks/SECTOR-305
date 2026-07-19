import { describe, expect, it } from "vitest";
import {
  createRuntimeFromScenario,
  listRegisteredScenarioIds,
  loadCompanionSession,
  materializeScenario,
  fridayMetaConsistent,
} from "../src/scenario/loadScenario.js";
import { replaySession } from "../src/runtime.js";
import { includesAllHard } from "../src/grade/multiset.js";

describe("D-LOADER scenario JSON → Runtime", () => {
  it("registers checkride and watch builders", () => {
    const ids = listRegisteredScenarioIds();
    expect(ids).toContain("checkride_a07_ocean_robbery_v1");
    expect(ids).toContain("watch_a07_friday_night_v1");
  });

  it("materializes checkride from scenario.json + fixtures", () => {
    const m = materializeScenario("checkride_a07_ocean_robbery_v1");
    expect(m.meta.seed).toBe(305001);
    expect(m.meta.kind).toBe("checkride");
    expect(m.incidents.some((i) => i.id === "cfs-001")).toBe(true);
    expect(m.units.length).toBeGreaterThanOrEqual(10);
  });

  it("createRuntimeFromScenario + companion fail session produces sacred hard fails", () => {
    const { runtime, material } = createRuntimeFromScenario(
      "checkride_a07_ocean_robbery_v1"
    );
    const session = loadCompanionSession(material.scenarioDir, "fail");
    const { debrief } = replaySession(
      material.pack,
      material.units,
      material.incidents,
      session
    );
    expect(debrief.passed).toBe(false);
    expect(
      includesAllHard(debrief.hardFails, [
        "FAIL_NO_VERIFY",
        "FAIL_PRIORITY_UNDERCODE",
        "FAIL_NO_READBACK",
      ])
    ).toBe(true);
  });

  it("createRuntimeFromScenario + companion pass session has zero hard fails", () => {
    const { material } = createRuntimeFromScenario("checkride_a07_ocean_robbery_v1");
    const session = loadCompanionSession(material.scenarioDir, "pass");
    const { debrief } = replaySession(
      material.pack,
      material.units,
      material.incidents,
      session
    );
    expect(debrief.passed).toBe(true);
    expect(debrief.hardFails).toEqual([]);
  });

  it("watch scenario materializes ≥8 CFS and consistent meta", () => {
    const m = materializeScenario("watch_a07_friday_night_v1");
    expect(m.incidents.length).toBeGreaterThanOrEqual(8);
    expect(fridayMetaConsistent(m.meta)).toBe(true);
    const { runtime } = createRuntimeFromScenario("watch_a07_friday_night_v1");
    runtime.apply({ type: "Advance", ms: 1000 });
    expect(runtime.state.clockMs).toBe(1000);
  });

  it("unknown scenario id throws", () => {
    expect(() => materializeScenario("no_such_scenario_xyz")).toThrow();
  });
});
