#!/usr/bin/env node
/**
 * Headless sim runner — intentional fail demo + pass path.
 * Usage: npx tsx src/cli/sim.ts [fail|pass|replay]
 */
import { baseUnitsA07, incidentRobberyBadAddress, incidentTheftReport } from "../fixtures.js";
import { loadDefaultPack } from "../loadPack.js";
import { Runtime } from "../runtime.js";
import type { PlayerCommand } from "../types.js";

function runFail(): void {
  const pack = loadDefaultPack();
  const rt = new Runtime({
    pack,
    scenarioId: "checkride_fail_demo",
    seed: 305,
    units: baseUnitsA07(),
    incidents: [incidentRobberyBadAddress()],
  });

  // Post-cue: player undercodes, never verifies, single-units, omits weapons, and gets no ACK.
  const commands: Array<{ atMs: number; cmd: PlayerCommand }> = [
    {
      atMs: 27000,
      cmd: {
        type: "DispatchUnits",
        incidentId: "cfs-001",
        unitIds: ["u-3a12"],
        radioCaption: "3A12, P3 disturbance, beach area",
      },
    },
    { atMs: 80000, cmd: { type: "NoOp" } },
  ];
  rt.applyAll(commands);
  const d = rt.debrief();
  console.log(JSON.stringify(d, null, 2));
  if (d.passed) {
    console.error("EXPECTED FAIL but passed");
    process.exit(1);
  }
  console.error(`\nFAIL DEMO OK — ${d.hardFails.length} hard fails`);
}

function runPass(): void {
  const pack = loadDefaultPack();
  const rt = new Runtime({
    pack,
    scenarioId: "checkride_pass_demo",
    seed: 305,
    units: baseUnitsA07(),
    incidents: [incidentRobberyBadAddress(), incidentTheftReport()],
  });

  const commands: Array<{ atMs: number; cmd: PlayerCommand }> = [
    // Truth-derived actions occur only after their information-set cues.
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
    // Reclass to P1 robbery weapons
    { atMs: 17000, cmd: { type: "SetNature", incidentId: "cfs-001", natureCode: "ROBBERY-IP", natureText: "Robbery in progress" } },
    { atMs: 17500, cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P1" } },
    { atMs: 18000, cmd: { type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true } },
    { atMs: 18500, cmd: { type: "SetFlag", incidentId: "cfs-001", flag: "NEEDS_BACKUP", value: true } },
    {
      atMs: 28000,
      cmd: {
        type: "DispatchUnits",
        incidentId: "cfs-001",
        unitIds: ["u-3a12", "u-3a14"],
        radioCaption:
          "3A12, 3A14, P1 robbery in progress, 1400 block Ocean Drive, weapon reported, suspect fled northbound",
      },
    },
    // Unit acks before timeout
    {
      atMs: 30000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a12",
        incidentId: "cfs-001",
        caption: "3A12 copy, en route 1400 Ocean",
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
    // Clear cleanly: units to AVL via clear incident helper
    {
      atMs: 50000,
      cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "CLR" },
    },
    {
      atMs: 50100,
      cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "AVL" },
    },
    {
      atMs: 50200,
      cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "CLR" },
    },
    {
      atMs: 50300,
      cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "AVL" },
    },
    {
      atMs: 51000,
      cmd: { type: "ClearIncident", incidentId: "cfs-001", disposition: "GOA" },
    },
    // Low priority theft — ok to hold attention later
    {
      atMs: 52000,
      cmd: {
        type: "DispatchUnits",
        incidentId: "cfs-002",
        unitIds: ["u-3a21"],
        radioCaption: "3A21, P4 theft report, 200 block Collins Avenue",
      },
    },
    {
      atMs: 53000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a21",
        incidentId: "cfs-002",
        caption: "3A21 en route",
        kind: "ACK",
      },
    },
    {
      atMs: 54000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a21",
        incidentId: "cfs-002",
        caption: "3A21 on scene",
        kind: "STATUS",
      },
    },
    { atMs: 55000, cmd: { type: "SetUnitStatus", unitId: "u-3a21", status: "CLR" } },
    { atMs: 55100, cmd: { type: "SetUnitStatus", unitId: "u-3a21", status: "AVL" } },
    {
      atMs: 56000,
      cmd: { type: "ClearIncident", incidentId: "cfs-002", disposition: "RPT" },
    },
  ];

  rt.applyAll(commands);
  const d = rt.debrief();
  console.log(JSON.stringify({ passed: d.passed, hardFails: d.hardFails, softMarks: d.softMarks, metrics: d.metrics }, null, 2));
  if (!d.passed) {
    console.error("EXPECTED PASS but failed");
    process.exit(1);
  }
  console.error("\nPASS DEMO OK");
}

const mode = process.argv[2] ?? "fail";
if (mode === "pass") runPass();
else runFail();
