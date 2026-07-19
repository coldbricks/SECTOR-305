/**
 * Core domain types for SECTOR 305.
 * Domain spine (Incident, Unit, RadioEvent, GradeEvent, SessionRecord, Scenario,
 * PlayerCommand, IncidentTruth) is owned by Zod schemas under ./schema.
 * This module re-exports those types and defines runtime-only aggregates.
 */

export type {
  PriorityCode,
  UnitStatus,
  IncidentStatus,
  LocationConfidence,
  GradeSeverity,
  CallerLanguage,
  UnitType,
  NoteAuthor,
  RadioDirection,
  RadioKind,
  IncidentFlag,
  RadioSlotName,
  RadioTemplateId,
  ScenarioKind,
  LocationRef,
  LocationRefPartial,
  CadNote,
  PriorityHistoryEntry,
  TruthKnowableCue,
  RadioSlots,
  RadioStructured,
} from "./schema/common.js";

export type { IncidentTruth } from "./schema/incidentTruth.js";
export type { Incident } from "./schema/incident.js";
export type { Unit } from "./schema/unit.js";
export type { RadioEvent } from "./schema/radioEvent.js";
export type { GradeEvent, GradeEvidence } from "./schema/gradeEvent.js";
export type { SessionRecord, SessionCommandStep } from "./schema/sessionRecord.js";
export type {
  Scenario,
  ScenarioTimelineEvent,
  PassConditions,
  FailDemo,
} from "./schema/scenario.js";
export type {
  PlayerCommand,
  PlayerCommandType,
  VerifyLocationCmd,
  SetPriorityCmd,
  SetNatureCmd,
  AddNoteCmd,
  SetFlagCmd,
  DispatchUnitsCmd,
  AddUnitToIncidentCmd,
  ReleaseUnitCmd,
  SetUnitStatusCmd,
  RadioTxCmd,
  RadioTxFreeformCmd,
  AckReadbackCmd,
  UnitRadioRxCmd,
  ClearIncidentCmd,
  CancelIncidentCmd,
  HoldIncidentCmd,
  RequestStatusCheckCmd,
  AdvanceCmd,
  InjectIncidentCmd,
  InjectRadioCmd,
  SetChannelEmergencyCmd,
  LinkDuplicateCmd,
  NoOpCmd,
} from "./schema/playerCommand.js";

export type { FailCode, SoftCode, GradeCode, GradeDomain } from "./grade/codes.js";

import type { SoftBandScore } from "./grade/softBand.js";
import type { GradeEvent } from "./schema/gradeEvent.js";
import type { Incident } from "./schema/incident.js";
import type { PlayerCommand } from "./schema/playerCommand.js";
import type { RadioEvent } from "./schema/radioEvent.js";
import type { Unit } from "./schema/unit.js";

/** Runtime sim log entry (command / inject / timer / system). */
export interface SimEvent {
  id: string;
  atMs: number;
  kind: "command" | "inject" | "timer" | "system";
  command?: PlayerCommand;
  detail?: string;
}

/** Full sector runtime state (not a SessionRecord — derived). */
export interface SectorState {
  clockMs: number;
  seed: number;
  sectorId: string;
  packId: string;
  packVersion: string;
  scenarioId: string;
  units: Record<string, Unit>;
  incidents: Record<string, Incident>;
  radioLog: RadioEvent[];
  gradeLog: GradeEvent[];
  simLog: SimEvent[];
  channelEmergency: boolean;
  consoleId: string;
  ended: boolean;
  endReason: string | null;
}

/** Debrief / evaluation form projection. */
export interface Debrief {
  scenarioId: string;
  seed: number;
  clockMs: number;
  passed: boolean;
  hardFails: GradeEvent[];
  softMarks: GradeEvent[];
  /** Coaching product — weight/band; never alone flips hard pass */
  softBand: SoftBandScore;
  notes: GradeEvent[];
  timeline: Array<{ atMs: number; kind: string; summary: string }>;
  metrics: {
    incidentsTotal: number;
    incidentsCleared: number;
    dispatches: number;
    radioTx: number;
  };
  disclaimer: string;
}
