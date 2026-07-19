import { describe, expect, it } from "vitest";
import {
  FAIL_CODES,
  SOFT_CODES,
  isFailCode,
  isSoftCode,
} from "../src/grade/codes.js";
import {
  IncidentSchema,
  PLAYER_COMMAND_COUNT,
  PLAYER_COMMAND_TYPES,
  PlayerCommandSchema,
  SessionRecordSchema,
  UnitSchema,
} from "../src/schema/index.js";
import { baseUnitsA07, incidentRobberyBadAddress } from "../src/fixtures.js";

describe("schema spine", () => {
  it("has exactly 23 PlayerCommand variants", () => {
    expect(PLAYER_COMMAND_TYPES).toHaveLength(23);
    expect(PLAYER_COMMAND_COUNT).toBe(23);
    const unique = new Set(PLAYER_COMMAND_TYPES);
    expect(unique.size).toBe(23);
  });

  it("rejects unknown command discriminators", () => {
    const bad = PlayerCommandSchema.safeParse({
      type: "ForceUnitAck",
      unitId: "u-3a12",
      incidentId: "cfs-001",
    });
    expect(bad.success).toBe(false);
  });

  it("parses each command type with minimal valid payload", () => {
    const samples = [
      {
        type: "VerifyLocation",
        incidentId: "cfs-001",
        confidence: "verified",
      },
      { type: "SetPriority", incidentId: "cfs-001", priority: "P1" },
      { type: "SetNature", incidentId: "cfs-001", natureCode: "ROBBERY-IP" },
      { type: "AddNote", incidentId: "cfs-001", text: "note" },
      { type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true },
      {
        type: "DispatchUnits",
        incidentId: "cfs-001",
        unitIds: ["u-3a12"],
      },
      {
        type: "AddUnitToIncident",
        incidentId: "cfs-001",
        unitId: "u-3a14",
      },
      { type: "ReleaseUnit", unitId: "u-3a12" },
      { type: "SetUnitStatus", unitId: "u-3a12", status: "AVL" },
      {
        type: "RadioTx",
        templateId: "DISPATCH_ASSIGN",
        slots: { to_units: "3A12", priority: "P1", nature: "robbery", location: "1400 Ocean" },
      },
      {
        type: "RadioTxFreeform",
        to: "3A12",
        kind: "DISPATCH",
        caption: "3A12 P1 robbery 1400 Ocean",
      },
      { type: "AckReadback", radioEventId: "rx_1" },
      {
        type: "UnitRadioRx",
        unitId: "u-3a12",
        caption: "3A12 copy",
      },
      { type: "ClearIncident", incidentId: "cfs-001", disposition: "GOA" },
      { type: "CancelIncident", incidentId: "cfs-001" },
      { type: "HoldIncident", incidentId: "cfs-001", reason: "stacked" },
      { type: "RequestStatusCheck", unitId: "u-3a12" },
      { type: "Advance", ms: 1000 },
      {
        type: "InjectIncident",
        incident: {
          id: "cfs-x",
          cfsNumber: "26-9",
          priority: "P4",
          natureCode: "THEFT-REPORT",
          natureText: "Theft",
          location: { freeform: "x", zoneId: "Z-OCEAN" },
          locationConfidence: "verified",
          jurisdictionId: "CITY-BEACH",
          createdAtMs: 0,
          receivedAtMs: 0,
          callerLanguage: "en",
          truth: {
            actualLocation: { freeform: "x", zoneId: "Z-OCEAN" },
            actualPriority: "P4",
            actualNature: "THEFT-REPORT",
            weapons: false,
            inProgress: false,
            requiresBackup: false,
            callerLanguage: "en",
          },
        },
      },
      {
        type: "InjectRadio",
        from: "3A12",
        caption: "stepped —",
        steppedOn: true,
        incomplete: true,
      },
      { type: "SetChannelEmergency", active: true },
      {
        type: "LinkDuplicate",
        incidentId: "cfs-002",
        primaryIncidentId: "cfs-001",
      },
      { type: "NoOp" },
    ] as const;

    expect(samples).toHaveLength(23);
    for (const sample of samples) {
      const r = PlayerCommandSchema.safeParse(sample);
      expect(r.success, JSON.stringify(sample)).toBe(true);
    }
  });

  it("parses fixtures as Incident / Unit", () => {
    expect(IncidentSchema.safeParse(incidentRobberyBadAddress()).success).toBe(true);
    for (const u of baseUnitsA07()) {
      expect(UnitSchema.safeParse(u).success).toBe(true);
    }
  });

  it("rejects empty radio caption via freeform command", () => {
    const r = PlayerCommandSchema.safeParse({
      type: "RadioTxFreeform",
      to: "3A12",
      kind: "DISPATCH",
      caption: "",
    });
    expect(r.success).toBe(false);
  });

  it("SessionRecord requires engineVersion on parse default", () => {
    const r = SessionRecordSchema.parse({
      schemaVersion: 1,
      scenarioId: "s",
      packId: "p",
      packVersion: "0.1.0",
      seed: 1,
      commands: [],
    });
    expect(r.engineVersion.length).toBeGreaterThan(0);
  });

  it("grade code unions match Phase 0 floors", () => {
    expect(FAIL_CODES.length).toBe(24);
    expect(SOFT_CODES.length).toBe(15);
    expect(isFailCode("FAIL_NO_VERIFY")).toBe(true);
    expect(isSoftCode("SOFT_PRIORITY_LOW")).toBe(true);
    expect(isFailCode("SOFT_PRIORITY_LOW")).toBe(false);
  });
});
