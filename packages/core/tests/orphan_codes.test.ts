/**
 * S2-ORPHANS: every FAIL_/SOFT_ code is either emitted by a Runtime fixture
 * OR listed in DEFERRED_CODES with a phase tag (manifest amend / defer protocol).
 *
 * Silent orphans fail the guard. Mutation: empty DEFERRED + remove emission → red.
 */
import { describe, expect, it } from "vitest";
import { FAIL_CODES, SOFT_CODES } from "../src/grade/codes.js";
import { loadDefaultPack } from "../src/loadPack.js";
import { Runtime } from "../src/runtime.js";
import { baseUnitsA07, incidentRobberyBadAddress } from "../src/fixtures.js";
import type { Incident } from "../src/types.js";

/**
 * Phase-tagged deferrals — not silent orphans.
 * Allowed branch of S2-ORPHANS required fix (wire emit OR defer with phase).
 * FAIL_INFOSET_VIOLATION is test-only by design (M02a #21 grader-bug guard).
 */
export const DEFERRED_CODES: Record<string, string> = {
  FAIL_INFOSET_VIOLATION: "phase0_test_only_guard",
  FAIL_READBACK_WRONG: "phase1_structured_ack_slots",
  FAIL_NARRATIVE_MISSING_CRITICAL: "phase1_note_quality",
  SOFT_RADIO_WORDY: "phase1_brevity_nlp",
  SOFT_SLOW_KEY: "phase1_stimulus_timing",
  SOFT_NOTE_THIN: "phase1_note_quality",
  SOFT_UNIT_SUBOPTIMAL_TYPE: "phase1_assignment_soft",
  SOFT_LANGUAGE_NO_ATTEMPT: "phase1_language_line",
  // SOFT_STACK_REASON_THIN / SOFT_TIMER_WARNING_IGNORED / SOFT_CONCURRENCY_TUNNEL — emitted Phase 0
  SOFT_MAP_OVERTRUST: "phase1_map_ux",
  SOFT_CALLBACK_NOT_LOGGED: "phase1_ct_path",
  SOFT_BOLO_INCOMPLETE: "phase1_bolo",
};

function missingOrphans(emitted: Set<string>, deferred: Record<string, string>): string[] {
  const missing: string[] = [];
  for (const c of [...FAIL_CODES, ...SOFT_CODES]) {
    if (emitted.has(c)) continue;
    if (deferred[c]) continue;
    missing.push(c);
  }
  return missing;
}

/** Harvest gradeLog codes across fixtures that exercise Runtime emitters. */
function collectEmitted(): Set<string> {
  const pack = loadDefaultPack();
  const emitted = new Set<string>();
  const harvest = (rt: Runtime) => {
    for (const g of rt.state.gradeLog) emitted.add(g.code);
  };

  // 1) Post-cue fail checkride path — undercode / no backup / no readback / aging
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o1",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 26000 });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12"],
      radioCaption: "3A12, P3 disturbance, beach",
    });
    rt.apply({ type: "Advance", ms: 50000 });
    harvest(rt);
  }

  // 2) Safety not aired (caption omits weapons after knowable + flag)
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o2",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
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
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean",
    });
    harvest(rt);
  }

  // 3) Jurisdiction port
  {
    const inc = incidentRobberyBadAddress();
    inc.id = "port1";
    inc.location.zoneId = "Z-PORT";
    inc.jurisdictionId = "PORT";
    inc.locationConfidence = "verified";
    const rt = new Runtime({
      pack,
      scenarioId: "o3",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [inc],
    });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "port1",
      unitIds: ["u-3a12"],
      radioCaption: "3A12, P3 disturbance, port gate",
    });
    harvest(rt);
  }

  // 4) Wrong type traffic (patrol while traffic AVL)
  {
    const inc: Incident = {
      ...incidentRobberyBadAddress(),
      id: "tr1",
      natureCode: "TRAFFIC-CRASH",
      natureText: "Traffic crash",
      priority: "P2",
      locationConfidence: "verified",
      location: { freeform: "Biscayne", zoneId: "Z-DOWNTOWN" },
      truth: {
        ...incidentRobberyBadAddress().truth,
        actualNature: "TRAFFIC-CRASH",
        actualPriority: "P2",
        weapons: false,
        inProgress: false,
        requiresBackup: false,
        knowableSchedule: undefined,
      },
    };
    const rt = new Runtime({
      pack,
      scenarioId: "o4",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [inc],
    });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "tr1",
      unitIds: ["u-3a30"],
      radioCaption: "3A30, P2 traffic crash, Biscayne",
    });
    harvest(rt);
  }

  // 5) Illegal status
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o5",
      seed: 1,
      units: baseUnitsA07(),
    });
    rt.apply({ type: "SetUnitStatus", unitId: "u-3a12", status: "OS" });
    harvest(rt);
  }

  // 6) Dirty close + no disposition path elements
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o6",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
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
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon",
    });
    rt.apply({ type: "ClearIncident", incidentId: "cfs-001", disposition: "GOA" });
    harvest(rt);
  }

  // 7) Emergency traffic then routine = FAIL_RADIO_EMERGENCY_TRAFFIC
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o7",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({
      type: "RadioTxFreeform",
      to: "All",
      kind: "EMERGENCY",
      caption: "emergency traffic",
    });
    rt.apply({
      type: "RadioTxFreeform",
      to: "3A12",
      kind: "BOLO",
      caption: "bolo routine",
    });
    harvest(rt);
  }

  // 8) Channel abandon — two P1 pending
  {
    const a = incidentRobberyBadAddress();
    const b = {
      ...incidentRobberyBadAddress(),
      id: "cfs-b",
      cfsNumber: "26-x",
      priority: "P1" as const,
    };
    a.priority = "P1";
    const rt = new Runtime({
      pack,
      scenarioId: "o8",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [a, b],
    });
    rt.apply({ type: "Advance", ms: 1000 });
    harvest(rt);
  }

  // 9) Status stale — OS > 5m
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o9",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
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
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      caption: "en route",
      kind: "ACK",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      caption: "on scene",
      kind: "STATUS",
    });
    rt.apply({ type: "Advance", ms: 301_000 });
    harvest(rt);
  }

  // 10) Reclass no radio (immediate after assign, no reclass air)
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o10",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
    });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P3 disturbance, 1400 Ocean",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      caption: "en route",
      kind: "ACK",
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    harvest(rt);
  }

  // 11) Soft downgrade while rolling
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o11",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
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
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      caption: "en route",
      kind: "ACK",
    });
    rt.apply({
      type: "SetPriority",
      incidentId: "cfs-001",
      priority: "P3",
      reason: "caller calmed",
    });
    harvest(rt);
  }

  // 12) Soft status launder DIS→on scene
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o12",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
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
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      caption: "on scene",
      kind: "STATUS",
    });
    harvest(rt);
  }

  // 13) Hold high priority
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o13",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "HoldIncident", incidentId: "cfs-001", reason: "wait" });
    harvest(rt);
  }

  // 14) Wrong location verified
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o14",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 26000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "wrong", zoneId: "Z-WYNWOOD" },
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P1 robbery, wrong, weapon",
    });
    harvest(rt);
  }

  // 15) Unit not assignable
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o15",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.state.units["u-3a12"]!.status = "OOS";
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12"],
      radioCaption: "3A12 go",
    });
    harvest(rt);
  }

  // 16) Soft priority low pre-cue
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o16",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P4" });
    harvest(rt);
  }

  // 17) FAIL_PRIORITY_AGING
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o17",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "Advance", ms: 70000 });
    harvest(rt);
  }

  // 18) FAIL_RADIO_FORMAT (missing location-ish)
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o18",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
    });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "go now",
    });
    harvest(rt);
  }

  // 19) FAIL_NO_DISPOSITION
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o19",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "ClearIncident", incidentId: "cfs-001", disposition: "" });
    harvest(rt);
  }

  // 20) FAIL_DIVERT_WITHOUT_LOG
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o20",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
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
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      caption: "en route",
      kind: "ACK",
    });
    rt.apply({ type: "ReleaseUnit", unitId: "u-3a12" });
    harvest(rt);
  }

  // 21) FAIL_RECLASS_NO_RADIO (stale radio gap then priority jump)
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o21",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean", zoneId: "Z-OCEAN" },
    });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption: "3A12, 3A14, P3 disturbance, 1400 Ocean",
    });
    rt.apply({
      type: "UnitRadioRx",
      unitId: "u-3a12",
      caption: "en route",
      kind: "ACK",
    });
    rt.apply({ type: "Advance", ms: 5000 });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    harvest(rt);
  }

  // 22) FAIL_DOUBLE_ASSIGN_CONFLICT
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o22",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
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
      radioCaption: "3A12, 3A14, P1 robbery, 1400 Ocean, weapon",
    });
    rt.apply({
      type: "AddUnitToIncident",
      incidentId: "cfs-001",
      unitId: "u-3a12",
      radioCaption: "3A12 again",
    });
    harvest(rt);
  }

  // 23) SOFT_RADIO_FORMAT — missing unit callsign but has location words
  {
    const rt = new Runtime({
      pack,
      scenarioId: "o23",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [incidentRobberyBadAddress()],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({
      type: "VerifyLocation",
      incidentId: "cfs-001",
      confidence: "verified",
      location: { freeform: "1400 Ocean Drive", zoneId: "Z-OCEAN" },
    });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({ type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "cfs-001",
      unitIds: ["u-3a12", "u-3a14"],
      radioCaption:
        "robbery in progress at 1400 Ocean Drive block, weapon reported",
    });
    harvest(rt);
  }

  // 24) SOFT_CONCURRENCY_TUNNEL + SOFT_STACK_REASON_THIN + SOFT_TIMER_WARNING_IGNORED
  {
    const low = {
      ...incidentRobberyBadAddress(),
      id: "low_p4",
      cfsNumber: "26-low",
      priority: "P4" as const,
      natureCode: "THEFT-REPORT",
      natureText: "Theft report",
      locationConfidence: "verified" as const,
      location: { freeform: "200 Collins", zoneId: "Z-COLLINS" },
      truth: {
        ...incidentRobberyBadAddress().truth,
        actualPriority: "P4" as const,
        actualNature: "THEFT-REPORT",
        weapons: false,
        inProgress: false,
        requiresBackup: false,
        knowableSchedule: undefined,
      },
    };
    const high = incidentRobberyBadAddress();
    const rt = new Runtime({
      pack,
      scenarioId: "o24",
      seed: 1,
      units: baseUnitsA07(),
      incidents: [high, low],
    });
    rt.apply({ type: "Advance", ms: 16000 });
    rt.apply({ type: "SetPriority", incidentId: "cfs-001", priority: "P1" });
    rt.apply({
      type: "DispatchUnits",
      incidentId: "low_p4",
      unitIds: ["u-3a21"],
      radioCaption: "3A21, P4 theft report, 200 Collins",
    });
    rt.apply({
      type: "InjectIncident",
      incident: {
        id: "hold_soft",
        cfsNumber: "26-hold",
        priority: "P3",
        natureCode: "DISTURBANCE",
        natureText: "noise",
        location: { freeform: "900 Ocean", zoneId: "Z-OCEAN" },
        locationConfidence: "verified",
        jurisdictionId: "CITY-BEACH",
        createdAtMs: 0,
        receivedAtMs: 0,
        enteredAtMs: 0,
        callerLanguage: "en",
        flags: [],
        truth: {
          actualLocation: { freeform: "900 Ocean", zoneId: "Z-OCEAN" },
          actualPriority: "P3",
          actualNature: "DISTURBANCE",
          weapons: false,
          inProgress: false,
          requiresBackup: false,
          callerLanguage: "en",
        },
      },
    });
    rt.apply({ type: "HoldIncident", incidentId: "hold_soft", reason: "wait" });
    // P1 SLA 60s; 50% warning at 30s after priority set — advance from 16s by 20s => 36s age from received but priority set at 16s
    // age uses receivedAtMs of cfs-001 which is 0, so advance to 35000 total
    rt.apply({ type: "Advance", ms: 20000 });
    harvest(rt);
  }

  return emitted;
}

describe("S2-ORPHANS vocabulary coverage", () => {
  it("every FAIL_ and SOFT_ is emitted by fixture OR deferred with phase tag", () => {
    const emitted = collectEmitted();
    const missing = missingOrphans(emitted, DEFERRED_CODES);
    expect(missing, `silent orphans (not emitted, not deferred): ${missing.join(", ")}`).toEqual(
      []
    );
  });

  it("guard fails on silent orphan: remove emission + empty defer for that code", () => {
    const emitted = collectEmitted();

    // Baseline: live hard codes must actually appear in gradeLog (not just vocabulary).
    expect(emitted.has("FAIL_JURISDICTION")).toBe(true);
    expect(emitted.has("FAIL_UNIT_WRONG_TYPE")).toBe(true);
    expect(emitted.has("FAIL_CHANNEL_ABANDON")).toBe(true);
    expect(emitted.has("FAIL_STATUS_STALE")).toBe(true);
    expect(emitted.has("FAIL_RECLASS_NO_RADIO")).toBe(true);
    expect(emitted.has("FAIL_STATUS_ILLEGAL")).toBe(true);
    expect(emitted.has("SOFT_STATUS_QUERY_LATE")).toBe(true);

    // Mutation A: strip one live emission, leave DEFERRED unchanged → orphan detected.
    const mutatedEmit = new Set(emitted);
    mutatedEmit.delete("FAIL_JURISDICTION");
    expect(missingOrphans(mutatedEmit, DEFERRED_CODES)).toContain("FAIL_JURISDICTION");

    // Mutation B: empty DEFERRED entirely + strip emission → same silent orphan (and more).
    const emptyDeferred: Record<string, string> = {};
    mutatedEmit.delete("FAIL_STATUS_STALE");
    const orphansEmptyDefer = missingOrphans(mutatedEmit, emptyDeferred);
    expect(orphansEmptyDefer).toContain("FAIL_JURISDICTION");
    expect(orphansEmptyDefer).toContain("FAIL_STATUS_STALE");
    // Deferred-only codes also surface when DEFERRED is emptied:
    expect(orphansEmptyDefer).toContain("FAIL_INFOSET_VIOLATION");
    expect(orphansEmptyDefer).toContain("SOFT_BOLO_INCOMPLETE");

    // Phase tags on deferred rows are non-empty strings (amend protocol).
    for (const [code, phase] of Object.entries(DEFERRED_CODES)) {
      expect(phase.length, `${code} missing phase tag`).toBeGreaterThan(0);
    }
  });
});
