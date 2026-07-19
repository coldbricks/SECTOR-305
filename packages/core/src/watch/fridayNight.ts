/**
 * M05 busy-watch: single sector A07 Friday night load.
 * ≥8 CFS, ≥15 sim minutes, concurrency peak ≥3.
 */
import type { Incident, PlayerCommand, Unit } from "../types.js";
import { baseUnitsA07 } from "../fixtures.js";

function mkInc(p: {
  id: string;
  cfs: string;
  priority: Incident["priority"];
  nature: string;
  natureText: string;
  freeform: string;
  zoneId: string;
  receivedAtMs: number;
  confidence?: Incident["locationConfidence"];
  language?: Incident["callerLanguage"];
  truthPriority?: Incident["priority"];
  weapons?: boolean;
  backup?: boolean;
  jurisdictionId?: string;
}): Incident {
  return {
    id: p.id,
    cfsNumber: p.cfs,
    priority: p.priority,
    natureCode: p.nature,
    natureText: p.natureText,
    location: {
      freeform: p.freeform,
      zoneId: p.zoneId,
      city: p.zoneId === "Z-PORT" ? "Port of Miami" : "Miami Beach",
    },
    locationConfidence: p.confidence ?? "verified",
    jurisdictionId: p.jurisdictionId ?? (p.zoneId === "Z-PORT" ? "PORT" : "CITY-BEACH"),
    status: "PENDING",
    createdAtMs: p.receivedAtMs,
    receivedAtMs: p.receivedAtMs,
    enteredAtMs: p.receivedAtMs,
    priorityHistory: [],
    firstDispatchAtMs: null,
    firstEnRouteAtMs: null,
    firstOnSceneAtMs: null,
    lastUpdateAtMs: p.receivedAtMs,
    clearedAtMs: null,
    assignedUnitIds: [],
    primaryUnitId: null,
    callerLanguage: p.language ?? "en",
    flags: p.weapons ? ["WEAPONS"] : [],
    notes:
      p.language === "es"
        ? [
            {
              atMs: p.receivedAtMs,
              author: "call_taker",
              text: "Caller Spanish-primary — interpreter delay noted.",
            },
          ]
        : [],
    disposition: null,
    truth: {
      actualLocation: {
        freeform: p.freeform,
        zoneId: p.zoneId,
      },
      actualPriority: p.truthPriority ?? p.priority,
      actualNature: p.nature,
      weapons: p.weapons ?? false,
      inProgress: ["P0", "P1", "P2"].includes(p.truthPriority ?? p.priority),
      requiresBackup: p.backup ?? false,
      callerLanguage: p.language ?? "en",
      actualJurisdictionId: p.jurisdictionId,
    },
  };
}

export function fridayNightUnits(): Unit[] {
  return baseUnitsA07();
}

export function fridayNightIncidents(): Incident[] {
  return [
    mkInc({
      id: "w-001",
      cfs: "26-01001",
      priority: "P3",
      nature: "DISTURBANCE",
      natureText: "Loud music / crowd",
      freeform: "900 block Ocean Drive",
      zoneId: "Z-OCEAN",
      receivedAtMs: 0,
    }),
    mkInc({
      id: "w-002",
      cfs: "26-01002",
      priority: "P4",
      nature: "THEFT-REPORT",
      natureText: "Phone theft report",
      freeform: "300 block Collins Avenue",
      zoneId: "Z-COLLINS",
      receivedAtMs: 30000,
    }),
    mkInc({
      id: "w-003",
      cfs: "26-01003",
      priority: "P2",
      nature: "DOMESTIC",
      natureText: "Domestic disturbance",
      freeform: "1100 block Collins Avenue",
      zoneId: "Z-COLLINS",
      receivedAtMs: 90000,
      backup: true,
    }),
    mkInc({
      id: "w-004",
      cfs: "26-01004",
      priority: "P1",
      nature: "WEAPONS",
      natureText: "Armed subject",
      freeform: "1400 block Ocean Drive",
      zoneId: "Z-OCEAN",
      receivedAtMs: 120000,
      weapons: true,
      backup: true,
      confidence: "partial",
    }),
    mkInc({
      id: "w-005",
      cfs: "26-01005",
      priority: "P3",
      nature: "WELFARE",
      natureText: "Welfare check",
      freeform: "50 NE 1st Street",
      zoneId: "Z-DOWNTOWN",
      receivedAtMs: 180000,
      language: "es",
    }),
    mkInc({
      id: "w-006",
      cfs: "26-01006",
      priority: "P2",
      nature: "TRAFFIC-CRASH",
      natureText: "Traffic crash minor injuries",
      freeform: "Biscayne Blvd / NE 5th",
      zoneId: "Z-DOWNTOWN",
      receivedAtMs: 240000,
    }),
    mkInc({
      id: "w-007",
      cfs: "26-01007",
      priority: "P3",
      nature: "ALARM",
      natureText: "Commercial alarm",
      freeform: "NW 2nd Ave warehouse",
      zoneId: "Z-WYNWOOD",
      receivedAtMs: 360000,
    }),
    mkInc({
      id: "w-008",
      cfs: "26-01008",
      priority: "P2",
      nature: "SUSP-PERSON",
      natureText: "Suspicious person port fence",
      freeform: "Port perimeter gate B",
      zoneId: "Z-PORT",
      receivedAtMs: 480000,
      jurisdictionId: "PORT",
    }),
    mkInc({
      id: "w-009",
      cfs: "26-01009",
      priority: "P4",
      nature: "THEFT-REPORT",
      natureText: "Catalytic converter report (cold)",
      freeform: "600 block Ocean Drive",
      zoneId: "Z-OCEAN",
      receivedAtMs: 600000,
    }),
  ];
}

/** Bad play: ignore P1 weapons, only touch P4 cosmetics → aging fail */
export function fridayNightBadPlayCommands(): Array<{ atMs: number; cmd: PlayerCommand }> {
  return [
    {
      atMs: 5000,
      cmd: {
        type: "AddNote",
        incidentId: "w-001",
        text: "Music still loud per caller",
      },
    },
    {
      atMs: 130000,
      cmd: {
        type: "AddNote",
        incidentId: "w-002",
        text: "Caller wants case number later",
      },
    },
    { atMs: 200000, cmd: { type: "Advance", ms: 200000 } },
  ];
}

export const FRIDAY_NIGHT_META = {
  id: "watch_a07_friday_night_v1",
  seed: 305200,
  durationMs: 900_000,
  minCfs: 8,
  sectorId: "SE305-A07",
};
