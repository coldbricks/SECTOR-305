import type { Incident, Unit } from "./types.js";

export function baseUnitsA07(): Unit[] {
  const mk = (
    id: string,
    callsign: string,
    zoneId: string,
    type: Unit["type"] = "patrol"
  ): Unit => ({
    id,
    callsign,
    agencyId: "S305-PD",
    type,
    status: "AVL",
    statusChangedAtMs: 0,
    location: {
      freeform: `Patrol ${zoneId}`,
      zoneId,
    },
    capabilities: type === "supervisor" ? ["supervisor"] : [],
    assignedIncidentId: null,
    zoneId,
    lastKnownAtMs: 0,
  });

  return [
    mk("u-3a12", "3A12", "Z-OCEAN"),
    mk("u-3a14", "3A14", "Z-OCEAN"),
    mk("u-3a21", "3A21", "Z-COLLINS"),
    mk("u-3a22", "3A22", "Z-COLLINS"),
    mk("u-3a30", "3A30", "Z-DOWNTOWN"),
    mk("u-3a31", "3A31", "Z-DOWNTOWN"),
    mk("u-3a40", "3A40", "Z-WYNWOOD"),
    mk("u-3a41", "3A41", "Z-WYNWOOD"),
    mk("u-3s1", "3S1", "Z-OCEAN", "supervisor"),
    mk("u-3t1", "3T1", "Z-DOWNTOWN", "traffic"),
  ];
}

/** C1+C2+C5 checkride CFS */
export function incidentRobberyBadAddress(): Incident {
  return {
    id: "cfs-001",
    cfsNumber: "26-000142",
    priority: "P3",
    natureCode: "DISTURBANCE",
    natureText: "Disturbance / loud argument",
    location: {
      freeform: "by the neon club on the beach",
      zoneId: "Z-OCEAN",
      city: "Miami Beach",
    },
    locationConfidence: "unverified",
    jurisdictionId: "CITY-BEACH",
    status: "PENDING",
    createdAtMs: 0,
    receivedAtMs: 0,
    enteredAtMs: null,
    priorityHistory: [],
    firstDispatchAtMs: null,
    firstEnRouteAtMs: null,
    firstOnSceneAtMs: null,
    lastUpdateAtMs: 0,
    clearedAtMs: null,
    assignedUnitIds: [],
    primaryUnitId: null,
    callerLanguage: "en",
    flags: [],
    notes: [
      {
        atMs: 0,
        author: "call_taker",
        text: "Caller frantic — 'fight outside the neon place Ocean somewhere' — no block yet.",
      },
    ],
    disposition: null,
    truth: {
      actualLocation: {
        freeform: "1400 block Ocean Drive",
        block: "1400",
        street: "Ocean Drive",
        zoneId: "Z-OCEAN",
        city: "Miami Beach",
      },
      actualPriority: "P1",
      actualNature: "ROBBERY-IP",
      weapons: true,
      inProgress: true,
      requiresBackup: true,
      callerLanguage: "en",
      notes: "Truth: armed robbery in progress 1400 Ocean; caller initially minimized.",
      // Empty schedule = truth immediately knowable (fail demos / pass reclass)
      // Author C10 scenarios by setting knowableSchedule with delayed weapons facet.
    },
  };
}

export function incidentTheftReport(): Incident {
  return {
    id: "cfs-002",
    cfsNumber: "26-000143",
    priority: "P4",
    natureCode: "THEFT-REPORT",
    natureText: "Theft report — phone taken earlier today",
    location: {
      freeform: "200 block Collins Avenue",
      block: "200",
      street: "Collins Avenue",
      zoneId: "Z-COLLINS",
      city: "Miami Beach",
    },
    locationConfidence: "verified",
    jurisdictionId: "CITY-BEACH",
    status: "PENDING",
    createdAtMs: 5000,
    receivedAtMs: 5000,
    enteredAtMs: 5000,
    priorityHistory: [],
    firstDispatchAtMs: null,
    firstEnRouteAtMs: null,
    firstOnSceneAtMs: null,
    lastUpdateAtMs: 5000,
    clearedAtMs: null,
    assignedUnitIds: [],
    primaryUnitId: null,
    callerLanguage: "en",
    flags: [],
    notes: [],
    disposition: null,
    truth: {
      actualLocation: {
        freeform: "200 block Collins Avenue",
        block: "200",
        street: "Collins Avenue",
        zoneId: "Z-COLLINS",
        city: "Miami Beach",
      },
      actualPriority: "P4",
      actualNature: "THEFT-REPORT",
      weapons: false,
      inProgress: false,
      requiresBackup: false,
      callerLanguage: "en",
    },
  };
}
