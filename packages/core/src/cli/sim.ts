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

  // Player undercodes, never verifies, single-units, no weapons on radio — should hard fail
  const commands: Array<{ atMs: number; cmd: PlayerCommand }> = [
    { atMs: 1000, cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P4" } },
    {
      atMs: 2000,
      cmd: {
        type: "DispatchUnits",
        incidentId: "cfs-001",
        unitIds: ["u-3a12"],
        radioCaption: "3A12, Priority 4 disturbance, beach area",
      },
    },
    { atMs: 50000, cmd: { type: "Advance", ms: 50000 } },
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
    // Verify location properly
    {
      atMs: 2000,
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
    { atMs: 3000, cmd: { type: "SetNature", incidentId: "cfs-001", natureCode: "ROBBERY-IP", natureText: "Robbery in progress" } },
    { atMs: 3500, cmd: { type: "SetPriority", incidentId: "cfs-001", priority: "P1" } },
    { atMs: 4000, cmd: { type: "SetFlag", incidentId: "cfs-001", flag: "WEAPONS", value: true } },
    { atMs: 4100, cmd: { type: "SetFlag", incidentId: "cfs-001", flag: "NEEDS_BACKUP", value: true } },
    {
      atMs: 5000,
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
      atMs: 8000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a12",
        incidentId: "cfs-001",
        caption: "3A12 copy, en route 1400 Ocean",
        kind: "ACK",
      },
    },
    {
      atMs: 9000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a14",
        incidentId: "cfs-001",
        caption: "3A14 en route",
        kind: "ACK",
      },
    },
    {
      atMs: 20000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a12",
        incidentId: "cfs-001",
        caption: "3A12 on scene",
        kind: "STATUS",
      },
    },
    {
      atMs: 25000,
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
      atMs: 40000,
      cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "CLR" },
    },
    {
      atMs: 40100,
      cmd: { type: "SetUnitStatus", unitId: "u-3a12", status: "AVL" },
    },
    {
      atMs: 40200,
      cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "CLR" },
    },
    {
      atMs: 40300,
      cmd: { type: "SetUnitStatus", unitId: "u-3a14", status: "AVL" },
    },
    {
      atMs: 41000,
      cmd: { type: "ClearIncident", incidentId: "cfs-001", disposition: "GOA" },
    },
    // Low priority theft — ok to hold attention later
    {
      atMs: 45000,
      cmd: {
        type: "DispatchUnits",
        incidentId: "cfs-002",
        unitIds: ["u-3a21"],
        radioCaption: "3A21, P4 theft report, 200 block Collins Avenue",
      },
    },
    {
      atMs: 46000,
      cmd: {
        type: "UnitRadioRx",
        unitId: "u-3a21",
        incidentId: "cfs-002",
        caption: "3A21 en route",
        kind: "ACK",
      },
    },
    {
      atMs: 50000,
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
