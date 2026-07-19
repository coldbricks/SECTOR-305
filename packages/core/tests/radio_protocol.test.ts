import { describe, expect, it } from "vitest";
import { RADIO_TEMPLATES, renderTemplate, parseFreeformRadio } from "../src/radio/templates.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";
import { baseUnitsA07, incidentRobberyBadAddress } from "../src/fixtures.js";

describe("M01c / M06 radio protocol", () => {
  it("has at least 12 templates", () => {
    expect(RADIO_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it("DISPATCH_ASSIGN requires slots", () => {
    const r = renderTemplate("DISPATCH_ASSIGN", {
      to_units: "3A12",
      priority: "P1",
      nature: "robbery",
      location: "1400 Ocean",
      safety: "weapon reported",
    });
    expect(r.missing).toEqual([]);
    expect(r.caption).toContain("3A12");
    expect(r.caption).toContain("weapon");
  });

  it("missing required slots reported", () => {
    const r = renderTemplate("DISPATCH_ASSIGN", { to_units: "3A12" });
    expect(r.missing).toContain("priority");
    expect(r.missing).toContain("location");
  });

  it("freeform parser extracts unit and priority", () => {
    const p = parseFreeformRadio("3A12, P1 robbery, 1400 Ocean, weapon reported");
    expect(p.to_units).toMatch(/3A12/i);
    expect(p.priority).toMatch(/P1/i);
    expect(p.safety).toBe("weapons");
  });

  it("emergency traffic blocks routine TX", () => {
    const pack = loadDefaultPack();
    const rt = new Runtime({
      pack,
      scenarioId: "em",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({
      type: "RadioTxFreeform",
      to: "All units",
      kind: "EMERGENCY",
      caption: "All units emergency traffic 3A12 Ocean",
    });
    expect(rt.state.channelEmergency).toBe(true);
    rt.apply({
      type: "RadioTxFreeform",
      to: "3A21",
      kind: "BOLO",
      caption: "BOLO routine stuff",
    });
    expect(
      rt.state.gradeLog.some((g) => g.code === "FAIL_RADIO_EMERGENCY_TRAFFIC")
    ).toBe(true);
  });

  it("readback timeout grades FAIL_NO_READBACK on truth-high dispatch", () => {
    const pack = loadDefaultPack();
    const rt = new Runtime({
      pack,
      scenarioId: "rb",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon reported",
    });
    rt.apply({ type: "Advance", ms: 50000 });
    expect(rt.state.gradeLog.some((g) => g.code === "FAIL_NO_READBACK")).toBe(true);
  });
});
