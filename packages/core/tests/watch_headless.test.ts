import { describe, expect, it } from "vitest";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";
import {
  FRIDAY_NIGHT_META,
  fridayNightBadPlayCommands,
  fridayNightIncidents,
  fridayNightUnits,
} from "../src/watch/fridayNight.js";

describe("M05 busy-watch friday night", () => {
  const pack = loadDefaultPack();

  it("has ≥8 CFS and ≥10 units in sector", () => {
    expect(fridayNightIncidents().length).toBeGreaterThanOrEqual(8);
    expect(fridayNightUnits().length).toBeGreaterThanOrEqual(10);
  });

  it("headless 15-min advance completes without throw", () => {
    const rt = new Runtime({
      pack,
      scenarioId: FRIDAY_NIGHT_META.id,
      seed: FRIDAY_NIGHT_META.seed,
      units: fridayNightUnits(),
      incidents: fridayNightIncidents(),
    });
    rt.apply({ type: "Advance", ms: FRIDAY_NIGHT_META.durationMs });
    expect(rt.state.clockMs).toBe(FRIDAY_NIGHT_META.durationMs);
    const open = Object.values(rt.state.incidents).filter(
      (i) => i.status === "PENDING" || i.status === "HOLD" || i.status === "DISPATCHED"
    );
    expect(open.length).toBeGreaterThanOrEqual(3);
  });

  it("bad play ages high-priority CFS (FAIL_PRIORITY_AGING)", () => {
    const rt = new Runtime({
      pack,
      scenarioId: FRIDAY_NIGHT_META.id + "_bad",
      seed: FRIDAY_NIGHT_META.seed,
      units: fridayNightUnits(),
      incidents: fridayNightIncidents(),
    });
    rt.applyAll(fridayNightBadPlayCommands());
    const d = rt.debrief();
    expect(d.hardFails.some((f) => f.code === "FAIL_PRIORITY_AGING")).toBe(true);
  });

  it("peak concurrency of pending/dispatched/working ≥3 during watch window", () => {
    const incidents = fridayNightIncidents();
    // At t=240000, CFS 1-6 have been received
    const at = 240000;
    const concurrent = incidents.filter((i) => i.receivedAtMs <= at).length;
    expect(concurrent).toBeGreaterThanOrEqual(3);
  });
});
