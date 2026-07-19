import type { PlayerCommand } from "../src/types.js";

/**
 * Fair fail path — post-cue only (S1-PSYCHIC / C10).
 * applyAll advances the clock to each step.atMs (fires knowableSchedule);
 * do NOT insert Advance(ms) steps that double-count wall time.
 *
 * Cue times (incidentRobberyBadAddress):
 *   weapons/nature/priority @15000, location @25000
 */
export function failCommands(): Array<{ atMs: number; cmd: PlayerCommand }> {
  return [
    {
      atMs: 2000,
      cmd: {
        type: "AddNote",
        incidentId: "cfs-001",
        text: "Monitoring loud disturbance",
      },
    },
    // Post weapons+location cues: still dispatch as P3, one unit, no verify, no weapons air
    {
      atMs: 27000,
      cmd: {
        type: "DispatchUnits",
        incidentId: "cfs-001",
        unitIds: ["u-3a12"],
        radioCaption: "3A12, P3 disturbance, beach area",
      },
    },
    // Past readbackTimeoutMs (45s) after dispatch @27s → due @72s
    { atMs: 80000, cmd: { type: "NoOp" } },
  ];
}

/**
 * Fair pass path — all truth-derived actions after enabling cues.
 * Nature/P1/weapons after @15000; exact block verify after @25000.
 */
export function passCommands(): Array<{ atMs: number; cmd: PlayerCommand }> {
  return [
    {
      atMs: 1000,
      cmd: {
        type: "AddNote",
        incidentId: "cfs-001",
        text: "Holding for better location",
      },
    },
    {
      atMs: 17000,
      cmd: {
        type: "SetNature",
        incidentId: "cfs-001",
        natureCode: "ROBBERY-IP",
        natureText: "Robbery in progress",
      },
    },
    {
      atMs: 17500,
      cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P1" },
    },
    {
      atMs: 18000,
      cmd: {
        type: "SetFlag",
        incidentId: "cfs-001",
        flag: "WEAPONS",
        value: true,
      },
    },
    {
      atMs: 18500,
      cmd: {
        type: "SetFlag",
        incidentId: "cfs-001",
        flag: "NEEDS_BACKUP",
        value: true,
      },
    },
    {
      atMs: 27000,
      cmd: {
        type: "VerifyLocation",
        incidentId: "cfs-001",
        confidence: "verified",
        location: {
          freeform: "1400 block Ocean Drive",
          block: "1400",
          street: "Ocean Drive",
          zoneId: "Z-OCEAN",
        },
      },
    },
    {
      atMs: 28000,
      cmd: {
        type: "DispatchUnits",
        incidentId: "cfs-001",
        unitIds: ["u-3a12", "u-3a14"],
        radioCaption:
          "3A12, 3A14, P1 robbery in progress, 1400 block Ocean Drive, weapon reported",
      },
    },
    {
      atMs: 30000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a12",
        incidentId: "cfs-001",
        caption: "3A12 copy, en route",
        kind: "ACK",
      },
    },
    {
      atMs: 31000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a14",
        incidentId: "cfs-001",
        caption: "3A14 en route",
        kind: "ACK",
      },
    },
    {
      atMs: 40000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a12",
        incidentId: "cfs-001",
        caption: "3A12 on scene",
        kind: "STATUS",
      },
    },
    {
      atMs: 41000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a14",
        incidentId: "cfs-001",
        caption: "3A14 on scene",
        kind: "STATUS",
      },
    },
    { atMs: 50000, cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "CLR" } },
    { atMs: 50100, cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "AVL" } },
    { atMs: 50200, cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "CLR" } },
    { atMs: 50300, cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "AVL" } },
    {
      atMs: 51000,
      cmd: { type: "ClearIncident", incidentId: "cfs-001", disposition: "GOA" },
    },
  ];
}
