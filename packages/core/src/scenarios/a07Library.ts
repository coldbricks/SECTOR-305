/**
 * A07 scenario library — browser-safe materialization (no node:fs).
 * Expand here first; scenario.json under scenarios/ is the authoring mirror.
 */
import type { Incident, Unit } from "../types.js";
import {
  baseUnitsA07,
  incidentRobberyBadAddress,
  incidentTheftReport,
} from "../fixtures.js";
import {
  fridayNightIncidents,
  fridayNightUnits,
} from "../watch/fridayNight.js";

export type ScenarioKind = "checkride" | "watch" | "academy";

export interface ScenarioCatalogEntry {
  id: string;
  kind: ScenarioKind;
  title: string;
  seed: number;
  brief: string;
  adversarialTags: string[];
  contentNotes: string[];
  /** Soft order for shell menu */
  menuOrder: number;
}

function mkInc(p: {
  id: string;
  cfs: string;
  priority: Incident["priority"];
  nature: string;
  natureText: string;
  freeform: string;
  zoneId: string;
  receivedAtMs?: number;
  confidence?: Incident["locationConfidence"];
  language?: Incident["callerLanguage"];
  truthPriority?: Incident["priority"];
  truthNature?: string;
  weapons?: boolean;
  backup?: boolean;
  inProgress?: boolean;
  jurisdictionId?: string;
  block?: string;
  street?: string;
  knowableSchedule?: Incident["truth"]["knowableSchedule"];
  notes?: Incident["notes"];
}): Incident {
  const zoneId = p.zoneId;
  const jurisdictionId =
    p.jurisdictionId ?? (zoneId === "Z-PORT" ? "PORT" : "CITY-BEACH");
  return {
    id: p.id,
    cfsNumber: p.cfs,
    priority: p.priority,
    natureCode: p.nature,
    natureText: p.natureText,
    location: {
      freeform: p.freeform,
      zoneId,
      block: p.block,
      street: p.street,
      city: zoneId === "Z-PORT" ? "Port of Miami" : "Miami Beach",
    },
    locationConfidence: p.confidence ?? "unverified",
    jurisdictionId,
    status: "PENDING",
    createdAtMs: p.receivedAtMs ?? 0,
    receivedAtMs: p.receivedAtMs ?? 0,
    enteredAtMs: p.confidence === "verified" ? p.receivedAtMs ?? 0 : null,
    priorityHistory: [],
    firstDispatchAtMs: null,
    firstEnRouteAtMs: null,
    firstOnSceneAtMs: null,
    lastUpdateAtMs: p.receivedAtMs ?? 0,
    clearedAtMs: null,
    assignedUnitIds: [],
    primaryUnitId: null,
    callerLanguage: p.language ?? "en",
    flags: p.weapons ? ["WEAPONS"] : [],
    notes: p.notes ?? [],
    disposition: null,
    truth: {
      actualLocation: {
        freeform: p.freeform.includes("block")
          ? p.freeform
          : p.block && p.street
            ? `${p.block} block ${p.street}`
            : p.freeform,
        block: p.block,
        street: p.street,
        zoneId,
      },
      actualPriority: p.truthPriority ?? p.priority,
      actualNature: p.truthNature ?? p.nature,
      weapons: p.weapons ?? false,
      inProgress:
        p.inProgress ??
        ["P0", "P1", "P2"].includes(p.truthPriority ?? p.priority),
      requiresBackup: p.backup ?? false,
      callerLanguage: p.language ?? "en",
      actualJurisdictionId: jurisdictionId,
      knowableSchedule: p.knowableSchedule,
    },
  };
}

/** Catalog — shell menu + scenario picker */
export const A07_SCENARIO_CATALOG: ScenarioCatalogEntry[] = [
  {
    id: "checkride_a07_ocean_robbery_v1",
    kind: "checkride",
    title: "Ocean robbery — bad initial address",
    seed: 305001,
    brief: "Imperfect location, delayed weapons cue, backup + air discipline.",
    adversarialTags: ["C1", "C2", "C4", "C5"],
    contentNotes: ["weapons CAD text only", "no-gore", "fictional"],
    menuOrder: 10,
  },
  {
    id: "checkride_a07_priority_aging_v1",
    kind: "checkride",
    title: "Priority aging — do not tunnel the P4",
    seed: 305010,
    brief: "P1 sits hot while a cold theft tempts you. Launch before SLA.",
    adversarialTags: ["C2", "C6"],
    contentNotes: ["fictional", "no-gore"],
    menuOrder: 20,
  },
  {
    id: "checkride_a07_emergency_hold_v1",
    kind: "checkride",
    title: "Emergency traffic — hold the air",
    seed: 305020,
    brief: "Channel emergency is open. Routine TX fails. Protect the air.",
    adversarialTags: ["C9"],
    contentNotes: ["fictional", "radio pressure"],
    menuOrder: 30,
  },
  {
    id: "checkride_a07_port_handoff_v1",
    kind: "checkride",
    title: "Port edge — jurisdiction handoff",
    seed: 305030,
    brief: "Z-PORT CFS. Flag handoff before you launch or eat FAIL_JURISDICTION.",
    adversarialTags: ["C7"],
    contentNotes: ["fictional port authority", "no-gore"],
    menuOrder: 40,
  },
  {
    id: "checkride_a07_dirty_close_v1",
    kind: "checkride",
    title: "Dirty close — units still rolling",
    seed: 305040,
    brief: "Clear only after units are clean. Status hygiene is the grade.",
    adversarialTags: ["C3"],
    contentNotes: ["fictional", "no-gore"],
    menuOrder: 50,
  },
  {
    id: "checkride_a07_concurrency_v1",
    kind: "checkride",
    title: "Two highs — concurrency tunnel",
    seed: 305050,
    brief: "Two high-acuity pending. Do not abandon the channel for cosmetics.",
    adversarialTags: ["C6"],
    contentNotes: ["fictional", "no-gore"],
    menuOrder: 60,
  },
  {
    id: "checkride_a07_shots_ocean_v1",
    kind: "checkride",
    title: "Shots heard — Ocean corridor",
    seed: 305060,
    brief: "P2 shots with weapons texture. Build the response; air safety.",
    adversarialTags: ["C2", "C4"],
    contentNotes: ["shots as CAD nature only", "no-gore"],
    menuOrder: 70,
  },
  {
    id: "checkride_a07_domestic_collins_v1",
    kind: "checkride",
    title: "Domestic — Collins mid-beach",
    seed: 305070,
    brief: "Backup required by house law. Verify, pair units, caption clean.",
    adversarialTags: ["C4"],
    contentNotes: ["domestic training-safe", "no graphic detail"],
    menuOrder: 80,
  },
  {
    id: "checkride_a07_traffic_type_v1",
    kind: "checkride",
    title: "Traffic crash — use the right unit",
    seed: 305080,
    brief: "Traffic unit is AVL. Patrol-only when 3T1 is up can hard-fail type.",
    adversarialTags: ["C4"],
    contentNotes: ["fictional", "no-gore"],
    menuOrder: 90,
  },
  {
    id: "checkride_a07_wrong_zone_v1",
    kind: "checkride",
    title: "Wrong zone verify trap",
    seed: 305090,
    brief: "Caller noise vs truth zone. Verify the real corridor before launch.",
    adversarialTags: ["C1", "C10"],
    contentNotes: ["fictional", "imperfect location"],
    menuOrder: 100,
  },
  {
    id: "academy_a07_verify_only_v1",
    kind: "academy",
    title: "Academy · Verify before launch",
    seed: 305110,
    brief: "Single skill: location confidence before high-acuity dispatch.",
    adversarialTags: ["C1"],
    contentNotes: ["academy drill", "fictional"],
    menuOrder: 200,
  },
  {
    id: "academy_a07_backup_only_v1",
    kind: "academy",
    title: "Academy · Backup depth",
    seed: 305120,
    brief: "Single skill: never send one unit on weapons/IP house policy.",
    adversarialTags: ["C4"],
    contentNotes: ["academy drill", "fictional"],
    menuOrder: 210,
  },
  {
    id: "academy_a07_radio_caption_v1",
    kind: "academy",
    title: "Academy · Air the safety",
    seed: 305130,
    brief: "Single skill: weapons known must ride the caption.",
    adversarialTags: ["C5"],
    contentNotes: ["academy drill", "fictional"],
    menuOrder: 220,
  },
  {
    id: "academy_a07_readback_v1",
    kind: "academy",
    title: "Academy · Get the readback",
    seed: 305140,
    brief: "Single skill: P1 dispatch without ACK in window fails.",
    adversarialTags: ["C5"],
    contentNotes: ["academy drill", "fictional"],
    menuOrder: 230,
  },
  {
    id: "academy_a07_status_hygiene_v1",
    kind: "academy",
    title: "Academy · Status hygiene",
    seed: 305150,
    brief: "Single skill: legal transitions and clean close.",
    adversarialTags: ["C3"],
    contentNotes: ["academy drill", "fictional"],
    menuOrder: 240,
  },
  {
    id: "watch_a07_friday_night_v1",
    kind: "watch",
    title: "Friday night — sector concurrency",
    seed: 305200,
    brief: "Nine CFS, aging traps, language note, port edge. Survive the load.",
    adversarialTags: ["C6", "C7", "C8"],
    contentNotes: ["fictional", "language delay note only", "no-gore"],
    menuOrder: 300,
  },
  {
    id: "watch_a07_saturday_pulse_v1",
    kind: "watch",
    title: "Saturday pulse — mid-beach stack",
    seed: 305210,
    brief: "Collins/Ocean stack with one high and several routine traps.",
    adversarialTags: ["C6"],
    contentNotes: ["fictional", "no-gore"],
    menuOrder: 310,
  },
];

function materializeBody(id: string): { units: Unit[]; incidents: Incident[] } {
  switch (id) {
    case "checkride_a07_ocean_robbery_v1":
      return {
        units: baseUnitsA07(),
        incidents: [incidentRobberyBadAddress(), incidentTheftReport()],
      };

    case "checkride_a07_priority_aging_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000201",
            priority: "P1",
            nature: "ASSAULT-IP",
            natureText: "Assault in progress — Ocean sidewalk",
            freeform: "900 block Ocean Drive",
            zoneId: "Z-OCEAN",
            block: "900",
            street: "Ocean Drive",
            confidence: "partial",
            truthPriority: "P1",
            weapons: false,
            backup: true,
            inProgress: true,
            notes: [
              {
                atMs: 0,
                author: "call_taker",
                text: "[CT] Active fight, people screaming — Priority one cues now.",
              },
            ],
          }),
          mkInc({
            id: "cfs-002",
            cfs: "26-000202",
            priority: "P4",
            nature: "THEFT-REPORT",
            natureText: "Phone theft report",
            freeform: "300 block Collins Avenue",
            zoneId: "Z-COLLINS",
            block: "300",
            street: "Collins Avenue",
            confidence: "verified",
            receivedAtMs: 2000,
            truthPriority: "P4",
          }),
        ],
      };

    case "checkride_a07_emergency_hold_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000210",
            priority: "P2",
            nature: "DISTURBANCE",
            natureText: "Disturbance — hold for emergency traffic drill",
            freeform: "600 block Ocean Drive",
            zoneId: "Z-OCEAN",
            confidence: "verified",
            truthPriority: "P3",
            notes: [
              {
                atMs: 0,
                author: "system",
                text: "[SYS] Training inject: open emergency traffic, then attempt routine BOLO.",
              },
            ],
          }),
        ],
      };

    case "checkride_a07_port_handoff_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000220",
            priority: "P2",
            nature: "SUSP-PERSON",
            natureText: "Suspicious person — port fence",
            freeform: "Port perimeter gate B",
            zoneId: "Z-PORT",
            jurisdictionId: "PORT",
            confidence: "partial",
            truthPriority: "P2",
            notes: [
              {
                atMs: 0,
                author: "call_taker",
                text: "[CT] Subject on port fence at gate B — jurisdiction is PORT.",
              },
            ],
          }),
        ],
      };

    case "checkride_a07_dirty_close_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000230",
            priority: "P3",
            nature: "DISTURBANCE",
            natureText: "Loud party — status hygiene drill",
            freeform: "1100 block Collins Avenue",
            zoneId: "Z-COLLINS",
            block: "1100",
            street: "Collins Avenue",
            confidence: "verified",
            truthPriority: "P3",
          }),
        ],
      };

    case "checkride_a07_concurrency_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000240",
            priority: "P1",
            nature: "WEAPONS",
            natureText: "Armed subject — Ocean",
            freeform: "1400 block Ocean Drive",
            zoneId: "Z-OCEAN",
            block: "1400",
            street: "Ocean Drive",
            confidence: "partial",
            truthPriority: "P1",
            weapons: true,
            backup: true,
            notes: [
              {
                atMs: 0,
                author: "call_taker",
                text: "[CT] Guy with a gun on the sidewalk — people running.",
              },
            ],
          }),
          mkInc({
            id: "cfs-002",
            cfs: "26-000241",
            priority: "P1",
            nature: "ROBBERY-IP",
            natureText: "Robbery in progress — Collins",
            freeform: "200 block Collins Avenue",
            zoneId: "Z-COLLINS",
            block: "200",
            street: "Collins Avenue",
            confidence: "partial",
            receivedAtMs: 3000,
            truthPriority: "P1",
            weapons: true,
            backup: true,
            notes: [
              {
                atMs: 3000,
                author: "call_taker",
                text: "[CT] Second high — bag taken, possible weapon.",
              },
            ],
          }),
          mkInc({
            id: "cfs-003",
            cfs: "26-000242",
            priority: "P4",
            nature: "THEFT-REPORT",
            natureText: "Cold theft report",
            freeform: "Omni area",
            zoneId: "Z-DOWNTOWN",
            confidence: "verified",
            receivedAtMs: 5000,
            truthPriority: "P4",
          }),
        ],
      };

    case "checkride_a07_shots_ocean_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000250",
            priority: "P2",
            nature: "SHOTS-HEARD",
            natureText: "Shots heard — Ocean corridor",
            freeform: "600 block Ocean Drive",
            zoneId: "Z-OCEAN",
            block: "600",
            street: "Ocean Drive",
            confidence: "partial",
            truthPriority: "P2",
            weapons: true,
            backup: true,
            knowableSchedule: [
              {
                atMs: 10000,
                facet: "weapons",
                summary: "Caller: multiple shots, not going outside",
              },
            ],
          }),
        ],
      };

    case "checkride_a07_domestic_collins_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000260",
            priority: "P2",
            nature: "DOMESTIC",
            natureText: "Domestic disturbance",
            freeform: "1100 block Collins Avenue",
            zoneId: "Z-COLLINS",
            block: "1100",
            street: "Collins Avenue",
            confidence: "verified",
            truthPriority: "P2",
            backup: true,
            notes: [
              {
                atMs: 0,
                author: "call_taker",
                text: "[CT] Caller locked in bathroom — yelling / throwing things. Backup required.",
              },
            ],
          }),
        ],
      };

    case "checkride_a07_traffic_type_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000270",
            priority: "P2",
            nature: "TRAFFIC-CRASH",
            natureText: "Traffic crash — minor injuries reported",
            freeform: "Biscayne Blvd / NE 5th",
            zoneId: "Z-DOWNTOWN",
            confidence: "verified",
            truthPriority: "P2",
            notes: [
              {
                atMs: 0,
                author: "call_taker",
                text: "[CT] Two-car crash Biscayne / NE 5th — injury reported. 3T1 is AVL.",
              },
            ],
          }),
        ],
      };

    case "checkride_a07_wrong_zone_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000280",
            priority: "P1",
            nature: "ROBBERY-IP",
            natureText: "Robbery in progress — location contested",
            freeform: "somewhere on Collins maybe?",
            zoneId: "Z-COLLINS",
            confidence: "conflicting",
            truthPriority: "P1",
            truthNature: "ROBBERY-IP",
            weapons: true,
            backup: true,
            block: "1400",
            street: "Ocean Drive",
            knowableSchedule: [
              {
                atMs: 12000,
                facet: "weapons",
                summary: "Caller: he grabbed her bag, something in his hand",
              },
              {
                atMs: 20000,
                facet: "location",
                summary: "Updated: truth is 1400 Ocean Drive corridor, not Collins",
              },
            ],
          }),
        ],
      };

    case "academy_a07_verify_only_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000310",
            priority: "P1",
            nature: "WEAPONS",
            natureText: "Armed subject — academy verify",
            freeform: "by the neon club on the beach",
            zoneId: "Z-OCEAN",
            confidence: "unverified",
            truthPriority: "P1",
            weapons: true,
            backup: true,
            block: "1400",
            street: "Ocean Drive",
            knowableSchedule: [
              {
                atMs: 8000,
                facet: "location",
                summary: "Caller thinks 1400 Ocean Drive",
              },
            ],
          }),
        ],
      };

    case "academy_a07_backup_only_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000320",
            priority: "P1",
            nature: "ROBBERY-IP",
            natureText: "Robbery IP — academy backup",
            freeform: "1400 block Ocean Drive",
            zoneId: "Z-OCEAN",
            block: "1400",
            street: "Ocean Drive",
            confidence: "verified",
            truthPriority: "P1",
            weapons: true,
            backup: true,
          }),
        ],
      };

    case "academy_a07_radio_caption_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000330",
            priority: "P1",
            nature: "WEAPONS",
            natureText: "Weapons — academy caption",
            freeform: "900 block Ocean Drive",
            zoneId: "Z-OCEAN",
            block: "900",
            street: "Ocean Drive",
            confidence: "verified",
            truthPriority: "P1",
            weapons: true,
            backup: true,
          }),
        ],
      };

    case "academy_a07_readback_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000340",
            priority: "P1",
            nature: "ASSAULT-IP",
            natureText: "Assault IP — academy readback",
            freeform: "5th and Ocean",
            zoneId: "Z-OCEAN",
            confidence: "verified",
            truthPriority: "P1",
            backup: true,
          }),
        ],
      };

    case "academy_a07_status_hygiene_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "cfs-001",
            cfs: "26-000350",
            priority: "P3",
            nature: "ALARM",
            natureText: "Commercial alarm — academy status",
            freeform: "NW 2nd Ave warehouse",
            zoneId: "Z-WYNWOOD",
            confidence: "verified",
            truthPriority: "P3",
          }),
        ],
      };

    case "watch_a07_friday_night_v1":
      return {
        units: fridayNightUnits(),
        incidents: fridayNightIncidents(),
      };

    case "watch_a07_saturday_pulse_v1":
      return {
        units: baseUnitsA07(),
        incidents: [
          mkInc({
            id: "w-s01",
            cfs: "26-02001",
            priority: "P3",
            nature: "DISTURBANCE",
            natureText: "Loud music / crowd",
            freeform: "900 block Ocean Drive",
            zoneId: "Z-OCEAN",
            confidence: "verified",
          }),
          mkInc({
            id: "w-s02",
            cfs: "26-02002",
            priority: "P1",
            nature: "ROBBERY-IP",
            natureText: "Robbery in progress",
            freeform: "Lincoln Road mall area",
            zoneId: "Z-OCEAN",
            receivedAtMs: 45000,
            confidence: "partial",
            truthPriority: "P1",
            weapons: true,
            backup: true,
            knowableSchedule: [
              {
                atMs: 60000,
                facet: "weapons",
                summary: "Caller: he ran in with a knife!",
              },
            ],
          }),
          mkInc({
            id: "w-s03",
            cfs: "26-02003",
            priority: "P4",
            nature: "THEFT-REPORT",
            natureText: "Theft report",
            freeform: "200 block Collins Avenue",
            zoneId: "Z-COLLINS",
            receivedAtMs: 90000,
            confidence: "verified",
          }),
          mkInc({
            id: "w-s04",
            cfs: "26-02004",
            priority: "P2",
            nature: "DOMESTIC",
            natureText: "Domestic",
            freeform: "Washington Avenue mid beach",
            zoneId: "Z-COLLINS",
            receivedAtMs: 150000,
            confidence: "verified",
            backup: true,
          }),
          mkInc({
            id: "w-s05",
            cfs: "26-02005",
            priority: "P3",
            nature: "WELFARE",
            natureText: "Welfare check",
            freeform: "Alton Road corridor",
            zoneId: "Z-COLLINS",
            receivedAtMs: 210000,
            confidence: "partial",
          }),
          mkInc({
            id: "w-s06",
            cfs: "26-02006",
            priority: "P3",
            nature: "ALARM",
            natureText: "Commercial alarm",
            freeform: "NW 2nd Ave warehouse",
            zoneId: "Z-WYNWOOD",
            receivedAtMs: 300000,
            confidence: "verified",
          }),
          mkInc({
            id: "w-s07",
            cfs: "26-02007",
            priority: "P2",
            nature: "TRAFFIC-CRASH",
            natureText: "Traffic crash",
            freeform: "Biscayne Blvd / NE 5th",
            zoneId: "Z-DOWNTOWN",
            receivedAtMs: 360000,
            confidence: "verified",
          }),
          mkInc({
            id: "w-s08",
            cfs: "26-02008",
            priority: "P4",
            nature: "THEFT-REPORT",
            natureText: "Cold catalytic report",
            freeform: "600 block Ocean Drive",
            zoneId: "Z-OCEAN",
            receivedAtMs: 420000,
            confidence: "verified",
          }),
        ],
      };

    default:
      throw new Error(`Unknown A07 scenario id: ${id}`);
  }
}

export function listA07ScenarioIds(): string[] {
  return A07_SCENARIO_CATALOG.map((s) => s.id);
}

export function getA07CatalogEntry(id: string): ScenarioCatalogEntry | undefined {
  return A07_SCENARIO_CATALOG.find((s) => s.id === id);
}

export function materializeA07Scenario(id: string): {
  entry: ScenarioCatalogEntry;
  units: Unit[];
  incidents: Incident[];
} {
  const entry = getA07CatalogEntry(id);
  if (!entry) throw new Error(`Scenario not in A07 catalog: ${id}`);
  const { units, incidents } = materializeBody(id);
  return { entry, units, incidents };
}
