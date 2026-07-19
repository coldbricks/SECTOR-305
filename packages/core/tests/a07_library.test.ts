import { describe, expect, it } from "vitest";
import {
  A07_SCENARIO_CATALOG,
  listA07ScenarioIds,
  materializeA07Scenario,
} from "../src/scenarios/a07Library.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";

describe("A07 scenario library", () => {
  it("ships a deep catalog (≥15 playable ids)", () => {
    expect(A07_SCENARIO_CATALOG.length).toBeGreaterThanOrEqual(15);
    expect(listA07ScenarioIds().length).toBe(A07_SCENARIO_CATALOG.length);
  });

  it("materializes every catalog id with units + incidents", () => {
    for (const id of listA07ScenarioIds()) {
      const { entry, units, incidents } = materializeA07Scenario(id);
      expect(entry.id).toBe(id);
      expect(units.length).toBeGreaterThanOrEqual(8);
      expect(incidents.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("boots Runtime for each scenario without throw", () => {
    const pack = loadDefaultPack();
    for (const id of listA07ScenarioIds()) {
      const { entry, units, incidents } = materializeA07Scenario(id);
      const rt = new Runtime({
        pack,
        scenarioId: entry.id,
        seed: entry.seed,
        units,
        incidents,
      });
      expect(rt.snapshot().scenarioId).toBe(id);
      expect(Object.keys(rt.snapshot().incidents).length).toBe(incidents.length);
    }
  });
});
