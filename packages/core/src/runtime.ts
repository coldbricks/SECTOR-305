import {
  isAssignable,
  natureByCode,
  priorityRank,
  type DoctrinePack,
} from "./pack.js";
import { canTransitionStatus } from "./doctrine/statusMatrix.js";
import { mulberry32 } from "./rng.js";
import { DEBRIEF_DISCLAIMER } from "./grade/codes.js";
import { renderTemplate } from "./radio/templates.js";
import { ENGINE_VERSION } from "./schema/common.js";
import type {
  Debrief,
  GradeCode,
  GradeEvent,
  Incident,
  IncidentFlag,
  PlayerCommand,
  PriorityCode,
  RadioEvent,
  RadioTemplateId,
  SectorState,
  SessionRecord,
  Unit,
  UnitStatus,
} from "./types.js";

export interface CreateRuntimeOpts {
  pack: DoctrinePack;
  scenarioId: string;
  seed: number;
  units: Unit[];
  incidents?: Incident[];
  consoleId?: string;
}

export class Runtime {
  state: SectorState;
  pack: DoctrinePack;
  /** Seeded RNG reserved for watch inject jitter (Phase 0+). */
  private readonly rng: () => number;
  private pendingReadbacks: Map<string, { unitId: string; incidentId: string; dueMs: number }> =
    new Map();
  /** Applied knowable-schedule cue keys: `${incidentId}:${atMs}:${facet}` */
  private appliedCues = new Set<string>();
  /** Instance-local id counter (S3: no module-global interleave). */
  private idSeq = 0;

  private nid(prefix: string): string {
    this.idSeq += 1;
    return `${prefix}_${this.idSeq.toString(36)}`;
  }

  constructor(opts: CreateRuntimeOpts) {
    this.pack = opts.pack;
    this.rng = mulberry32(opts.seed);
    void this.rng;
    this.idSeq = 0;
    const units: Record<string, Unit> = {};
    for (const u of opts.units) units[u.id] = { ...u };
    const incidents: Record<string, Incident> = {};
    for (const i of opts.incidents ?? []) {
      incidents[i.id] = {
        ...i,
        notes: [...i.notes],
        assignedUnitIds: [...i.assignedUnitIds],
        flags: [...i.flags],
        priorityHistory: [...(i.priorityHistory ?? [])],
        firstEnRouteAtMs: i.firstEnRouteAtMs ?? null,
        lastUpdateAtMs: i.lastUpdateAtMs ?? i.receivedAtMs,
      };
    }

    this.state = {
      clockMs: 0,
      seed: opts.seed,
      sectorId: opts.pack.sectorId,
      packId: opts.pack.id,
      packVersion: opts.pack.version,
      scenarioId: opts.scenarioId,
      units,
      incidents,
      radioLog: [],
      gradeLog: [],
      simLog: [],
      channelEmergency: false,
      consoleId: opts.consoleId ?? opts.pack.consoleId,
      ended: false,
      endReason: null,
    };
  }

  snapshot(): SectorState {
    return structuredClone(this.state);
  }

  apply(cmd: PlayerCommand): SectorState {
    if (this.state.ended && cmd.type !== "Advance") return this.snapshot();
    const at = this.state.clockMs;
    this.state.simLog.push({
      id: this.nid("ev"),
      atMs: at,
      kind: "command",
      command: cmd,
      detail: cmd.type,
    });

    switch (cmd.type) {
      case "Advance":
        this.advance(cmd.ms);
        break;
      case "VerifyLocation":
        this.verifyLocation(cmd);
        break;
      case "SetPriority":
        this.setPriority(cmd.incidentId, cmd.priority, cmd.reason);
        break;
      case "SetNature":
        this.setNature(cmd.incidentId, cmd.natureCode, cmd.natureText);
        break;
      case "AddNote":
        this.addNote(cmd.incidentId, cmd.text);
        break;
      case "SetFlag":
        this.setFlag(cmd.incidentId, cmd.flag, cmd.value);
        break;
      case "DispatchUnits":
        this.dispatchUnits(cmd.incidentId, cmd.unitIds, cmd.radioCaption);
        break;
      case "AddUnitToIncident":
        this.addUnitToIncident(cmd.incidentId, cmd.unitId, cmd.radioCaption);
        break;
      case "ReleaseUnit":
        this.releaseUnit(cmd.unitId, cmd.reason);
        break;
      case "SetUnitStatus":
        this.setUnitStatus(cmd.unitId, cmd.status, cmd.note);
        break;
      case "RadioTx":
        this.radioTxTemplate(cmd);
        break;
      case "RadioTxFreeform":
        this.radioTxFreeform(cmd);
        break;
      case "AckReadback":
        this.ackReadback(cmd.radioEventId);
        break;
      case "UnitRadioRx":
        this.unitRadioRx(cmd);
        break;
      case "ClearIncident":
        this.clearIncident(cmd.incidentId, cmd.disposition);
        break;
      case "CancelIncident":
        this.cancelIncident(cmd.incidentId, cmd.disposition ?? "CAN");
        break;
      case "HoldIncident":
        this.holdIncident(cmd.incidentId, cmd.reason);
        break;
      case "RequestStatusCheck":
        this.requestStatusCheck(cmd.unitId, cmd.incidentId);
        break;
      case "InjectIncident":
        this.injectIncident(cmd.incident);
        break;
      case "InjectRadio":
        this.injectRadio(cmd);
        break;
      case "SetChannelEmergency":
        this.setChannelEmergency(cmd.active, cmd.reason);
        break;
      case "LinkDuplicate":
        this.linkDuplicate(cmd.incidentId, cmd.primaryIncidentId, cmd.reason);
        break;
      case "NoOp":
        break;
      default: {
        const _exhaustive: never = cmd;
        void _exhaustive;
      }
    }
    return this.snapshot();
  }

  applyAll(commands: Array<{ atMs: number; cmd: PlayerCommand }>): SectorState {
    const sorted = [...commands].sort((a, b) => a.atMs - b.atMs);
    for (const step of sorted) {
      if (step.atMs > this.state.clockMs) {
        this.advance(step.atMs - this.state.clockMs);
      }
      this.apply(step.cmd);
    }
    return this.snapshot();
  }

  private advance(ms: number): void {
    if (ms <= 0) return;
    const start = this.state.clockMs;
    const end = start + ms;
    this.state.clockMs = end;
    this.checkTimers(start, end);
  }

  private checkTimers(start: number, end: number): void {
    this.applyKnowableSchedule(start, end);

    // Readback timeouts
    for (const [radioId, pending] of [...this.pendingReadbacks.entries()]) {
      if (end >= pending.dueMs) {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_NO_READBACK",
          rubricId: "RAD_NO_READBACK",
          incidentId: pending.incidentId,
          unitId: pending.unitId,
          message:
            "P1/P0 dispatch readback not obtained — unit never acknowledged; reassign required.",
          evidence: {
            expected: "unit ACK within readback window",
            actual: "timeout",
            ruleRef: "radio.readback",
          },
        });
        this.pendingReadbacks.delete(radioId);
      }
    }

    // Priority aging: P1 pending too long without dispatch
    for (const inc of Object.values(this.state.incidents)) {
      if (inc.status !== "PENDING" && inc.status !== "HOLD") continue;
      const pri = this.pack.priorities.find((p) => p.code === inc.priority);
      if (!pri) continue;
      const age = end - inc.receivedAtMs;
      if (age > pri.dispatchSlaMs && priorityRank(inc.priority) <= 2) {
        const already = this.state.gradeLog.some(
          (g) => g.code === "FAIL_PRIORITY_AGING" && g.incidentId === inc.id
        );
        if (!already) {
          this.grade({
            severity: "hard_fail",
            code: "FAIL_PRIORITY_AGING",
            rubricId: "TIM_P1_AGING",
            incidentId: inc.id,
            message: `${inc.priority} CFS aged past dispatch SLA without assignment.`,
            evidence: {
              expected: `dispatch within ${pri.dispatchSlaMs}ms`,
              actual: `${age}ms`,
              ruleRef: "timers.dispatch_sla",
            },
          });
        }
      } else if (
        age > pri.dispatchSlaMs * 0.5 &&
        age <= pri.dispatchSlaMs &&
        priorityRank(inc.priority) <= 2
      ) {
        const already = this.state.gradeLog.some(
          (g) => g.code === "SOFT_TIMER_WARNING_IGNORED" && g.incidentId === inc.id
        );
        if (!already) {
          this.grade({
            severity: "soft",
            code: "SOFT_TIMER_WARNING_IGNORED",
            rubricId: "TIM_WARN",
            incidentId: inc.id,
            message: `${inc.priority} CFS past 50% of dispatch SLA still pending.`,
            evidence: {
              expected: "dispatch before SLA",
              actual: `${age}ms of ${pri.dispatchSlaMs}ms`,
              ruleRef: "timers.warning",
            },
          });
        }
      }
    }

    // FAIL_CHANNEL_ABANDON: ≥2 high-acuity pending, player only worked lower
    const highPending = Object.values(this.state.incidents).filter(
      (i) =>
        (i.status === "PENDING" || i.status === "HOLD") &&
        priorityRank(i.priority) <= 1
    );
    if (highPending.length >= 2) {
      const already = this.state.gradeLog.some((g) => g.code === "FAIL_CHANNEL_ABANDON");
      if (!already) {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_CHANNEL_ABANDON",
          rubricId: "MUL_ABANDON",
          message: "Multiple high-acuity CFS pending — channel abandon / concurrency fail.",
          evidence: {
            expected: "triage high-acuity queue",
            actual: `${highPending.length} high pending`,
            ruleRef: "concurrency.abandon",
          },
        });
      }
    }

    // FAIL_STATUS_STALE: unit OS on high-risk > 5 min without note
    for (const u of Object.values(this.state.units)) {
      if (u.status !== "OS" || !u.assignedIncidentId) continue;
      const dwell = end - u.statusChangedAtMs;
      if (dwell > 300_000) {
        const already = this.state.gradeLog.some(
          (g) => g.code === "FAIL_STATUS_STALE" && g.unitId === u.id
        );
        if (!already) {
          this.grade({
            severity: "hard_fail",
            code: "FAIL_STATUS_STALE",
            rubricId: "STA_STALE",
            unitId: u.id,
            incidentId: u.assignedIncidentId,
            message: `${u.callsign} on scene stale >5m without status hygiene.`,
            evidence: {
              expected: "status update within 300s",
              actual: `${dwell}ms`,
              ruleRef: "timers.status_stale",
            },
          });
        }
      }
    }
  }

  private getIncident(id: string): Incident | null {
    return this.state.incidents[id] ?? null;
  }

  private getUnit(id: string): Unit | null {
    return this.state.units[id] ?? null;
  }

  private grade(
    partial: Omit<GradeEvent, "id" | "atMs"> & { atMs?: number; code: GradeCode }
  ): void {
    const ev: GradeEvent = {
      id: this.nid("gr"),
      atMs: partial.atMs ?? this.state.clockMs,
      severity: partial.severity,
      code: partial.code,
      rubricId: partial.rubricId,
      incidentId: partial.incidentId,
      unitId: partial.unitId,
      message: partial.message,
      evidence: partial.evidence,
    };
    this.state.gradeLog.push(ev);
  }

  private touchIncident(inc: Incident): void {
    inc.lastUpdateAtMs = this.state.clockMs;
  }

  private verifyLocation(cmd: Extract<PlayerCommand, { type: "VerifyLocation" }>): void {
    const inc = this.getIncident(cmd.incidentId);
    if (!inc) return;
    inc.locationConfidence = cmd.confidence;
    if (cmd.location) {
      inc.location = { ...inc.location, ...cmd.location };
    }
    if (cmd.confidence === "verified" || cmd.confidence === "partial") {
      // Align freeform with truth when player verifies correctly against truth zone
      // TRUTH-GATE-OK(verify-alignment): world-model fill after player-correct zone, not acuity grading
      if (cmd.location?.zoneId && cmd.location.zoneId === inc.truth.actualLocation.zoneId) {
        inc.location = {
          ...inc.location,
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
          ...inc.truth.actualLocation,
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
          freeform: cmd.location.freeform ?? inc.truth.actualLocation.freeform,
        };
      }
    }
    if (!inc.enteredAtMs) inc.enteredAtMs = this.state.clockMs;
    this.touchIncident(inc);
    inc.notes.push({
      atMs: this.state.clockMs,
      author: "player",
      text: `Location confidence → ${cmd.confidence}`,
    });
  }

  private setPriority(incidentId: string, priority: PriorityCode, reason?: string): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;
    const prev = inc.priority;
    if (prev === priority) return;
    inc.priorityHistory = inc.priorityHistory ?? [];
    inc.priorityHistory.push({
      atMs: this.state.clockMs,
      from: prev,
      to: priority,
      reason,
      author: "player",
    });
    inc.priority = priority;
    this.touchIncident(inc);
    inc.notes.push({
      atMs: this.state.clockMs,
      author: "player",
      text: reason
        ? `Priority ${prev} → ${priority} (${reason})`
        : `Priority ${prev} → ${priority}`,
    });
    // Upgrade while units rolling without radio re-tone → FAIL_RECLASS_NO_RADIO
    if (priorityRank(priority) < priorityRank(prev)) {
      const rolling = inc.assignedUnitIds.some((uid) => {
        const u = this.getUnit(uid);
        return u && (u.status === "DIS" || u.status === "ER" || u.status === "OS");
      });
      if (rolling) {
        const recentRadio = this.state.radioLog.some(
          (r) =>
            r.direction === "dispatch_tx" &&
            r.atMs >= this.state.clockMs - 1000 &&
            r.incidentId === incidentId
        );
        if (!recentRadio) {
          this.grade({
            severity: "hard_fail",
            code: "FAIL_RECLASS_NO_RADIO",
            rubricId: "PRI_RETONE",
            incidentId,
            message: "Priority upgraded while units rolling without radio re-tone.",
            evidence: {
              expected: "dispatch re-tone",
              actual: `${prev}→${priority}`,
              ruleRef: "priority.retone",
            },
          });
        }
      }
    }
    // Downgrade while units rolling
    if (priorityRank(priority) > priorityRank(prev)) {
      const rolling = inc.assignedUnitIds.some((uid) => {
        const u = this.getUnit(uid);
        return u && (u.status === "ER" || u.status === "OS");
      });
      if (rolling) {
        this.grade({
          severity: "soft",
          code: "SOFT_DOWNGRADE_WHILE_ROLLING",
          rubricId: "PRI_DOWN_ROLLING",
          incidentId,
          message: `Priority downgraded ${prev}→${priority} while unit(s) ER/OS.`,
          evidence: {
            expected: "hold or document heavy",
            actual: priority,
            ruleRef: "priority.downgrade_rolling",
          },
        });
      }
    }
    // Undercode vs truth — only hard-fail when high acuity is KNOWABLE (C10)
    // TRUTH-GATE-OK(setPriority): hard path gated by isHighAcuityKnowable; soft path pre-cue only
    if (priorityRank(priority) > priorityRank(inc.truth.actualPriority)) {
      if (this.isHighAcuityKnowable(inc)) {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_PRIORITY_UNDERCODE",
          rubricId: "PRI_UNDERCODE",
          incidentId,
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
          message: `Priority undercoded (${priority}) vs known/truth acuity (${inc.truth.actualPriority}).`,
          evidence: {
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
            expected: inc.truth.actualPriority,
            actual: priority,
            ruleRef: "priority.undercode",
          },
        });
      } else {
        this.grade({
          severity: "soft",
          code: "SOFT_PRIORITY_LOW",
          rubricId: "PRI_SOFT_LOW",
          incidentId,
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
          message: `Priority ${priority} lower than scenario truth ${inc.truth.actualPriority} (not yet knowable).`,
          evidence: {
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
            expected: inc.truth.actualPriority,
            actual: priority,
            ruleRef: "priority.soft_infoset",
          },
        });
      }
    }
  }

  /** Information-set: high acuity only grades hard undercode when knowable. */
  private isHighAcuityKnowable(inc: Incident): boolean {
    if (inc.flags.includes("WEAPONS") || inc.flags.includes("IN_PROGRESS")) return true;
    // TRUTH-GATE-OK(gate-definition): this method IS the knowable gate
    const sched = inc.truth.knowableSchedule;
    if (!sched || sched.length === 0) {
      // No schedule → truth is immediately knowable (legacy authoring)
      return (
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
        inc.truth.weapons ||
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
        inc.truth.inProgress ||
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
        priorityRank(inc.truth.actualPriority) <= 1
      );
    }
    return sched.some(
      (c) =>
        c.atMs <= this.state.clockMs &&
        (c.facet === "weapons" ||
          c.facet === "priority" ||
          c.facet === "nature" ||
          c.facet === "inProgress")
    );
  }

  private applyKnowableSchedule(start: number, end: number): void {
    for (const inc of Object.values(this.state.incidents)) {
      // TRUTH-GATE-OK(schedule-inject): reveals facets into player-visible notes/flags at cue time
      const sched = inc.truth.knowableSchedule;
      if (!sched?.length) continue;
      for (const cue of sched) {
        if (cue.atMs < start || cue.atMs > end) continue;
        const key = `${inc.id}:${cue.atMs}:${cue.facet}`;
        if (this.appliedCues.has(key)) continue;
        this.appliedCues.add(key);
        // Fire at cue time on the clock
        const saved = this.state.clockMs;
        this.state.clockMs = cue.atMs;
        inc.notes.push({
          atMs: cue.atMs,
          author: "call_taker",
          text: `[CT update] ${cue.summary}`,
        });
        if (cue.facet === "weapons") {
          this.setFlagInternal(inc, "WEAPONS", true);
        }
        if (cue.facet === "inProgress") {
          this.setFlagInternal(inc, "IN_PROGRESS", true);
        }
        if (cue.facet === "requiresBackup") {
          this.setFlagInternal(inc, "NEEDS_BACKUP", true);
        }
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
        if (cue.facet === "nature" && inc.truth.actualNature) {
          // do not auto-change player nature — note only; player must reclass
        }
        if (cue.facet === "location" && inc.locationConfidence === "unverified") {
          // partial location becomes available via note; player still verifies
          inc.notes.push({
            atMs: cue.atMs,
            author: "system",
            text: "Location cue available — verify before high-acuity dispatch.",
          });
        }
        this.touchIncident(inc);
        this.state.clockMs = saved;
      }
    }
  }

  private setNature(incidentId: string, natureCode: string, natureText?: string): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;
    inc.natureCode = natureCode;
    if (natureText) inc.natureText = natureText;
    const n = natureByCode(this.pack, natureCode);
    if (n) {
      if (n.requiresBackup) this.setFlagInternal(inc, "NEEDS_BACKUP", true);
      if (n.weaponsLikely) this.setFlagInternal(inc, "WEAPONS", true);
      if (n.inProgressDefault) this.setFlagInternal(inc, "IN_PROGRESS", true);
    }
    this.touchIncident(inc);
    inc.notes.push({
      atMs: this.state.clockMs,
      author: "player",
      text: `Nature → ${natureCode}`,
    });
  }

  private addNote(incidentId: string, text: string): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;
    this.touchIncident(inc);
    inc.notes.push({ atMs: this.state.clockMs, author: "player", text });
  }

  private setFlag(incidentId: string, flag: IncidentFlag, value: boolean): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;
    this.setFlagInternal(inc, flag, value);
    this.touchIncident(inc);
  }

  private setFlagInternal(inc: Incident, flag: IncidentFlag, value: boolean): void {
    const set = new Set<IncidentFlag>(inc.flags);
    if (value) set.add(flag);
    else set.delete(flag);
    inc.flags = [...set];
  }

  private dispatchUnits(
    incidentId: string,
    unitIds: string[],
    radioCaption?: string
  ): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;

    // Undercode at dispatch time (even if player never touched priority control)
    // TRUTH-GATE-OK(dispatch-undercode): hard-fail only when isHighAcuityKnowable
    if (
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
      priorityRank(inc.priority) > priorityRank(inc.truth.actualPriority) &&
      this.isHighAcuityKnowable(inc)
    ) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_PRIORITY_UNDERCODE",
        rubricId: "PRI_UNDERCODE_DISPATCH",
        incidentId,
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
        message: `Dispatched at ${inc.priority} while truth acuity is ${inc.truth.actualPriority}.`,
        evidence: {
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
          expected: inc.truth.actualPriority,
          actual: inc.priority,
          ruleRef: "priority.undercode_dispatch",
        },
      });
    }

    // Location gate: high set priority OR knowable high truth acuity requires verify
    // TRUTH-GATE-OK(dispatch-verify): acuity via isHighAcuityKnowable, not raw actualPriority
    const highAcuity =
      priorityRank(inc.priority) <= 1 || this.isHighAcuityKnowable(inc);
    if (
      this.pack.assignment.requireVerifiedOrPartialForP1 &&
      highAcuity &&
      (inc.locationConfidence === "unverified" || inc.locationConfidence === "conflicting")
    ) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_NO_VERIFY",
        rubricId: "LOC_NO_VERIFY",
        incidentId,
        message:
          "Dispatched high-acuity CFS without verified/partial location confidence.",
        evidence: {
          expected: "verified|partial",
          actual: inc.locationConfidence,
          ruleRef: "location.dispatch_gate",
        },
      });
    }

    // Wrong zone vs truth (dispatched to wrong place belief that contradicts truth after verify opportunity)
    // TRUTH-GATE-OK(verified-zone-compare): only after player claimed verified; grades wrong verify
    if (
      inc.locationConfidence === "verified" &&
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
      inc.location.zoneId !== inc.truth.actualLocation.zoneId
    ) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_WRONG_LOCATION",
        rubricId: "LOC_WRONG",
        incidentId,
        message: "Verified location zone does not match incident truth zone.",
        evidence: {
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
          expected: inc.truth.actualLocation.zoneId,
          actual: inc.location.zoneId,
          ruleRef: "location.zone",
        },
      });
    }

    const assigned: string[] = [];
    for (const uid of unitIds) {
      const u = this.getUnit(uid);
      if (!u) continue;
      if (!isAssignable(this.pack, u.status)) {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_UNIT_NOT_ASSIGNABLE",
          rubricId: "ASN_STATUS",
          incidentId,
          unitId: uid,
          message: `Attempted to assign ${u.callsign} in status ${u.status}.`,
          evidence: {
            expected: "assignable status",
            actual: u.status,
            ruleRef: "unit.assignable",
          },
        });
        continue;
      }
      if (!canTransitionStatus(u.status, "DIS")) {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_STATUS_ILLEGAL",
          rubricId: "STA_ILLEGAL",
          unitId: uid,
          incidentId,
          message: `Illegal status transition ${u.status} → DIS for ${u.callsign}.`,
          evidence: {
            expected: "legal transition",
            actual: `${u.status}->DIS`,
            ruleRef: "unit.status_graph",
          },
        });
        continue;
      }
      u.status = "DIS";
      u.statusChangedAtMs = this.state.clockMs;
      u.assignedIncidentId = incidentId;
      assigned.push(uid);
    }

    if (assigned.length === 0) return;

    // SOFT_CONCURRENCY_TUNNEL: working low priority while higher pending
    const higherPending = Object.values(this.state.incidents).filter(
      (i) =>
        i.id !== incidentId &&
        (i.status === "PENDING" || i.status === "HOLD") &&
        priorityRank(i.priority) < priorityRank(inc.priority)
    );
    if (higherPending.length > 0 && priorityRank(inc.priority) >= 3) {
      this.grade({
        severity: "soft",
        code: "SOFT_CONCURRENCY_TUNNEL",
        rubricId: "MUL_TUNNEL",
        incidentId,
        message: `Dispatched lower-priority CFS while ${higherPending.length} higher-priority pending.`,
        evidence: {
          expected: "triage higher first",
          actual: inc.priority,
          ruleRef: "concurrency.tunnel",
        },
      });
    }

    inc.assignedUnitIds = [...new Set([...inc.assignedUnitIds, ...assigned])];
    if (!inc.primaryUnitId) inc.primaryUnitId = assigned[0]!;
    if (!inc.firstDispatchAtMs) inc.firstDispatchAtMs = this.state.clockMs;
    if (inc.status === "PENDING" || inc.status === "HOLD") {
      inc.status = "DISPATCHED";
    }

    // Backup policy — only from knowable high risk / flags (no raw truth.weapons pre-cue)
    // TRUTH-GATE-OK(dispatch-backup): requiresBackup only when isHighAcuityKnowable
    const needsBackup =
      inc.flags.includes("NEEDS_BACKUP") ||
      (this.isHighAcuityKnowable(inc) &&
    // TRUTH-GATE-OK(callsite-tagged-for-gate-guard)
        (inc.truth.requiresBackup ||
          inc.flags.includes("WEAPONS") ||
          priorityRank(inc.priority) <= 1));
    if (needsBackup && inc.assignedUnitIds.length < this.pack.assignment.minBackupUnitsP1) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_NO_BACKUP",
        rubricId: "ASN_BACKUP",
        incidentId,
        message: `High-risk nature requires ≥${this.pack.assignment.minBackupUnitsP1} units; assigned ${inc.assignedUnitIds.length}.`,
        evidence: {
          expected: String(this.pack.assignment.minBackupUnitsP1),
          actual: String(inc.assignedUnitIds.length),
          ruleRef: "assignment.backup",
        },
      });
    }

    // Jurisdiction soft-hard: PORT zone without REF disposition path → FAIL_JURISDICTION
    if (
      (inc.location.zoneId === "Z-PORT" || inc.jurisdictionId === "PORT") &&
      !inc.flags.includes("HANDOFF_NOTED")
    ) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_JURISDICTION",
        rubricId: "JURIS_PORT",
        incidentId,
        message: "Dispatched port-edge CFS without handoff/refer flag.",
        evidence: {
          expected: "HANDOFF_NOTED or REF",
          actual: inc.jurisdictionId,
          ruleRef: "jurisdiction.handoff",
        },
      });
    }

    // Traffic nature + patrol when traffic AVL → FAIL_UNIT_WRONG_TYPE (hard when traffic available)
    if (inc.natureCode === "TRAFFIC-CRASH") {
      const hasTraffic = Object.values(this.state.units).some(
        (u) => u.type === "traffic" && u.status === "AVL"
      );
      const usedPatrolOnly = assigned.every(
        (id) => this.state.units[id]?.type === "patrol"
      );
      if (hasTraffic && usedPatrolOnly && assigned.length > 0) {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_UNIT_WRONG_TYPE",
          rubricId: "ASN_TYPE",
          incidentId,
          message: "Traffic crash assigned patrol while traffic unit AVL.",
          evidence: {
            expected: "traffic",
            actual: "patrol",
            ruleRef: "assignment.type",
          },
        });
      }
    }

    // Build final caption first — safety grades the EFFECTIVE caption (S2-SAFETYHATCH)
    let caption =
      radioCaption ??
      this.formatDispatch(
        inc,
        assigned.map((id) => this.state.units[id]!.callsign)
      );
    // TRUTH-GATE-OK(dispatch-safety): truth.weapons only when isHighAcuityKnowable
    const weaponsKnowable =
      inc.flags.includes("WEAPONS") ||
      (this.isHighAcuityKnowable(inc) && inc.truth.weapons);
    if (weaponsKnowable && !/weapon|gun|knife|armed/i.test(caption)) {
      // House law: auto-caption must include safety when weapons knowable and player omitted
      if (!radioCaption) {
        caption = `${caption}, weapon reported`;
      } else {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_SAFETY_NOT_AIRED",
          rubricId: "SAF_WEAPONS_RADIO",
          incidentId,
          message: "Known weapons/threat not aired on dispatch radio.",
          evidence: {
            expected: "weapons in radio caption",
            actual: caption,
            ruleRef: "safety.air_weapons",
          },
        });
      }
    }

    const radioId = this.nid("rx");
    const radio: RadioEvent = {
      id: radioId,
      atMs: this.state.clockMs,
      channelId: this.pack.radio.channelPrimary,
      direction: "dispatch_tx",
      from: this.state.consoleId,
      to: assigned.map((id) => this.state.units[id]!.callsign).join(", "),
      kind: "DISPATCH",
      caption,
      incidentId,
      unitId: assigned[0],
      // Readback: player priority OR knowable high acuity (not raw hidden truth pre-cue)
      // TRUTH-GATE-OK(dispatch-readback): isHighAcuityKnowable only
      requiresReadback:
        priorityRank(inc.priority) <= 1 || this.isHighAcuityKnowable(inc),
      readbackSatisfiedAtMs: null,
      steppedOn: false,
      incomplete: false,
      structured: {
        priority: inc.priority,
        nature: inc.natureCode,
        location: inc.location.freeform,
      },
    };
    this.state.radioLog.push(radio);

    // Element checks on caption
    this.gradeRadioDispatch(inc, caption);

    if (radio.requiresReadback) {
      // Track first unit for readback
      const first = assigned[0]!;
      this.pendingReadbacks.set(radioId, {
        unitId: first,
        incidentId,
        dueMs: this.state.clockMs + this.pack.radio.readbackTimeoutMs,
      });
    }

    inc.notes.push({
      atMs: this.state.clockMs,
      author: "player",
      text: `Dispatched ${assigned.map((id) => this.state.units[id]!.callsign).join(", ")}`,
    });
  }

  private formatDispatch(inc: Incident, callsigns: string[]): string {
    return `${callsigns.join(", ")}, ${inc.priority} ${inc.natureText}, ${inc.location.freeform}`;
  }

  private gradeRadioDispatch(inc: Incident, caption: string): void {
    const missing: string[] = [];
    for (const el of this.pack.radio.requiredDispatchElements) {
      if (el === "unit" && !/\d[A-Z]\d{1,3}|[A-Z]{1,3}\d+/i.test(caption)) missing.push(el);
      if (el === "priority" && !/P[0-5]|Priority\s*[0-5]/i.test(caption)) missing.push(el);
      if (el === "nature" && caption.trim().length < 8) missing.push(el);
      if (el === "location" && !inc.location.freeform.split(/\s+/).some((w) => caption.includes(w))) {
        // soft: location words
        if (!/\d{2,5}|block|street|ave|drive|blvd|ocean|collins/i.test(caption)) {
          missing.push(el);
        }
      }
    }
    if (missing.length) {
      this.grade({
        severity: missing.includes("location") ? "hard_fail" : "soft",
        code: missing.includes("location") ? "FAIL_RADIO_FORMAT" : "SOFT_RADIO_FORMAT",
        rubricId: "RAD_FORMAT",
        incidentId: inc.id,
        message: `Dispatch radio missing elements: ${missing.join(", ")}`,
        evidence: {
          expected: this.pack.radio.requiredDispatchElements.join(","),
          actual: caption,
          ruleRef: "radio.dispatch_elements",
        },
      });
    }
  }

  private setUnitStatus(unitId: string, status: UnitStatus, note?: string): void {
    const u = this.getUnit(unitId);
    if (!u) return;
    if (!canTransitionStatus(u.status, status)) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_STATUS_ILLEGAL",
        rubricId: "STA_ILLEGAL",
        unitId,
        incidentId: u.assignedIncidentId ?? undefined,
        message: `Illegal unit status ${u.status} → ${status} (${u.callsign}).`,
        evidence: {
          expected: "legal edge",
          actual: `${u.status}->${status}`,
          ruleRef: "unit.status_graph",
        },
      });
      return;
    }
    // Block AVL → OS skip
    if (u.status === "AVL" && status === "OS") {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_STATUS_ILLEGAL",
        rubricId: "STA_SKIP_ER",
        unitId,
        message: "Cannot go Available → On Scene without En Route.",
        evidence: { expected: "AVL→DIS→ER→OS", actual: "AVL→OS", ruleRef: "unit.status_graph" },
      });
      return;
    }
    u.status = status;
    u.statusChangedAtMs = this.state.clockMs;
    const incId = u.assignedIncidentId;
    if (incId) {
      const inc = this.getIncident(incId);
      if (inc && status === "ER") {
        if (!inc.firstEnRouteAtMs) inc.firstEnRouteAtMs = this.state.clockMs;
        this.touchIncident(inc);
      }
      if (inc && status === "OS" && !inc.firstOnSceneAtMs) {
        inc.firstOnSceneAtMs = this.state.clockMs;
        inc.status = "WORKING";
        this.touchIncident(inc);
      }
      if (status === "AVL") {
        u.assignedIncidentId = null;
        if (inc) {
          inc.assignedUnitIds = inc.assignedUnitIds.filter((id) => id !== unitId);
          this.touchIncident(inc);
        }
      }
    }
    u.lastKnownAtMs = this.state.clockMs;
    if (note) {
      this.state.radioLog.push({
        id: this.nid("rx"),
        atMs: this.state.clockMs,
        channelId: this.pack.radio.channelPrimary,
        direction: "system",
        from: this.state.consoleId,
        to: u.callsign,
        kind: "STATUS",
        caption: note,
        unitId,
        incidentId: incId ?? undefined,
        requiresReadback: false,
        readbackSatisfiedAtMs: null,
        steppedOn: false,
        incomplete: false,
      });
    }
  }

  private fillTemplateCaption(templateId: RadioTemplateId, slots: Record<string, string>): string {
    const { caption } = renderTemplate(templateId, slots);
    if (caption.trim().length > 0) return caption.trim();
    const joined = Object.values(slots).filter(Boolean).join(", ");
    return joined.length > 0 ? joined : templateId;
  }

  private templateKind(templateId: RadioTemplateId): RadioEvent["kind"] {
    switch (templateId) {
      case "DISPATCH_ASSIGN":
      case "DISPATCH_ADD_UNIT":
      case "DISPATCH_CANCEL":
      case "DISPATCH_REASSIGN":
      case "WELFARE_CHECK_DISPATCH":
        return "DISPATCH";
      case "STATUS_QUERY":
      case "READBACK_PROMPT":
        return "QUERY";
      case "STATUS_CORRECTION":
        return "STATUS";
      case "EMERGENCY_TRAFFIC_OPEN":
      case "EMERGENCY_TRAFFIC_CLEAR":
        return "EMERGENCY";
      case "BOLO":
        return "BOLO";
      case "GENERAL_BROADCAST":
        return "UPDATE";
      default: {
        const _n: never = templateId;
        void _n;
        return "SYSTEM";
      }
    }
  }

  private radioTxTemplate(cmd: Extract<PlayerCommand, { type: "RadioTx" }>): void {
    const caption = this.fillTemplateCaption(cmd.templateId, cmd.slots);
    const kind = this.templateKind(cmd.templateId);
    const radio: RadioEvent = {
      id: this.nid("rx"),
      atMs: this.state.clockMs,
      channelId: cmd.channelId ?? this.pack.radio.channelPrimary,
      direction: "dispatch_tx",
      from: this.state.consoleId,
      to: cmd.slots.to_units ?? null,
      kind,
      caption,
      incidentId: cmd.incidentId,
      unitId: cmd.unitId,
      requiresReadback: cmd.requiresReadback ?? false,
      readbackSatisfiedAtMs: null,
      steppedOn: false,
      incomplete: false,
      templateId: cmd.templateId,
      structured: { ...cmd.slots },
    };
    this.applyChannelEmergencyGate(kind, caption);
    if (cmd.templateId === "EMERGENCY_TRAFFIC_OPEN") {
      this.state.channelEmergency = true;
    }
    if (cmd.templateId === "EMERGENCY_TRAFFIC_CLEAR") {
      this.state.channelEmergency = false;
    }
    this.state.radioLog.push(radio);
  }

  private radioTxFreeform(cmd: Extract<PlayerCommand, { type: "RadioTxFreeform" }>): void {
    const radio: RadioEvent = {
      id: this.nid("rx"),
      atMs: this.state.clockMs,
      channelId: cmd.channelId ?? this.pack.radio.channelPrimary,
      direction: "dispatch_tx",
      from: this.state.consoleId,
      to: cmd.to,
      kind: cmd.kind,
      caption: cmd.caption,
      incidentId: cmd.incidentId,
      unitId: cmd.unitId,
      requiresReadback: cmd.requiresReadback ?? false,
      readbackSatisfiedAtMs: null,
      steppedOn: false,
      incomplete: false,
      structured: cmd.structured,
    };
    this.applyChannelEmergencyGate(cmd.kind, cmd.caption);
    if (cmd.kind === "EMERGENCY") {
      this.state.channelEmergency = true;
    }
    this.state.radioLog.push(radio);
  }

  private applyChannelEmergencyGate(kind: RadioEvent["kind"], caption: string): void {
    if (this.state.channelEmergency && kind !== "EMERGENCY" && kind !== "ACK") {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_RADIO_EMERGENCY_TRAFFIC",
        rubricId: "RAD_EMERGENCY",
        message: "Non-emergency traffic during emergency channel hold.",
        evidence: {
          expected: "hold non-emergency",
          actual: caption,
          ruleRef: "radio.emergency_traffic",
        },
      });
    }
  }

  private ackReadback(radioEventId: string): void {
    const r = this.state.radioLog.find((x) => x.id === radioEventId);
    if (!r) return;
    r.readbackSatisfiedAtMs = this.state.clockMs;
    this.pendingReadbacks.delete(radioEventId);
  }

  private unitRadioRx(cmd: Extract<PlayerCommand, { type: "UnitRadioRx" }>): void {
    const u = this.getUnit(cmd.unitId);
    const radio: RadioEvent = {
      id: this.nid("rx"),
      atMs: this.state.clockMs,
      channelId: this.pack.radio.channelPrimary,
      direction: "unit_tx",
      from: u?.callsign ?? cmd.unitId,
      to: this.state.consoleId,
      kind: cmd.kind ?? "ACK",
      caption: cmd.caption,
      incidentId: cmd.incidentId,
      unitId: cmd.unitId,
      requiresReadback: false,
      readbackSatisfiedAtMs: null,
      steppedOn: false,
      incomplete: false,
    };
    this.state.radioLog.push(radio);
    if (cmd.satisfiesReadbackFor) {
      this.ackReadback(cmd.satisfiesReadbackFor);
    } else {
      // Satisfy any pending readback for this unit
      for (const [rid, pending] of this.pendingReadbacks) {
        if (pending.unitId === cmd.unitId) {
          this.ackReadback(rid);
        }
      }
    }
    // Auto status progression on common phrases
    if (u) {
      if (/on\s*scene|arrived/i.test(cmd.caption)) {
        if (u.status === "DIS") {
          // S3-1: laundering DIS→OS without verbal ER — soft mark, still legal path via ER
          this.grade({
            severity: "soft",
            code: "SOFT_STATUS_QUERY_LATE",
            rubricId: "STA_LAUNDER",
            unitId: cmd.unitId,
            incidentId: cmd.incidentId,
            message: "Unit reported on scene from DIS without separate en route (status laundering).",
            evidence: {
              expected: "DIS→ER then OS",
              actual: "DIS→on scene phrase",
              ruleRef: "unit.status_hygiene",
            },
          });
          this.setUnitStatus(cmd.unitId, "ER");
        }
        if (u.status === "ER" || this.getUnit(cmd.unitId)?.status === "ER") {
          this.setUnitStatus(cmd.unitId, "OS");
        }
      } else if (/en\s*route|responding/i.test(cmd.caption) && u.status === "DIS") {
        this.setUnitStatus(cmd.unitId, "ER");
      }
    }
  }

  private addUnitToIncident(
    incidentId: string,
    unitId: string,
    radioCaption?: string
  ): void {
    const inc = this.getIncident(incidentId);
    const u = this.getUnit(unitId);
    if (!inc || !u) return;
    if (inc.assignedUnitIds.includes(unitId)) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_DOUBLE_ASSIGN_CONFLICT",
        rubricId: "ASN_DOUBLE",
        incidentId,
        unitId,
        message: `${u.callsign} already assigned to this CFS.`,
        evidence: {
          expected: "unique assign",
          actual: unitId,
          ruleRef: "assignment.double",
        },
      });
      return;
    }
    if (u.assignedIncidentId && u.assignedIncidentId !== incidentId) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_DOUBLE_ASSIGN_CONFLICT",
        rubricId: "ASN_DOUBLE_OTHER",
        incidentId,
        unitId,
        message: `${u.callsign} already assigned to ${u.assignedIncidentId}.`,
        evidence: {
          expected: "AVL or same CFS",
          actual: u.assignedIncidentId,
          ruleRef: "assignment.double",
        },
      });
      return;
    }
    // Reuse dispatch path for single unit (grades assignability, backup, radio)
    this.dispatchUnits(incidentId, [unitId], radioCaption);
  }

  private releaseUnit(unitId: string, reason?: string): void {
    const u = this.getUnit(unitId);
    if (!u) return;
    const incId = u.assignedIncidentId;
    if (incId) {
      const inc = this.getIncident(incId);
      if (inc) {
        if ((u.status === "ER" || u.status === "OS") && !reason) {
          this.grade({
            severity: "hard_fail",
            code: "FAIL_DIVERT_WITHOUT_LOG",
            rubricId: "ASN_DIVERT",
            incidentId: incId,
            unitId,
            message: `Released ${u.callsign} while ${u.status} without divert reason.`,
            evidence: {
              expected: "reason logged",
              actual: "none",
              ruleRef: "assignment.divert",
            },
          });
        }
        inc.assignedUnitIds = inc.assignedUnitIds.filter((id) => id !== unitId);
        if (inc.primaryUnitId === unitId) {
          inc.primaryUnitId = inc.assignedUnitIds[0] ?? null;
        }
        this.touchIncident(inc);
        inc.notes.push({
          atMs: this.state.clockMs,
          author: "player",
          text: reason
            ? `Released ${u.callsign}: ${reason}`
            : `Released ${u.callsign}`,
        });
      }
    }
    if (u.status === "DIS" || u.status === "ER" || u.status === "OS" || u.status === "CLR") {
      if (canTransitionStatus(u.status, "AVL")) {
        u.status = "AVL";
      } else if (canTransitionStatus(u.status, "CLR")) {
        u.status = "CLR";
      }
      u.statusChangedAtMs = this.state.clockMs;
    }
    u.assignedIncidentId = null;
    u.lastKnownAtMs = this.state.clockMs;
  }

  private requestStatusCheck(unitId: string, incidentId?: string): void {
    const u = this.getUnit(unitId);
    const callsign = u?.callsign ?? unitId;
    const radio: RadioEvent = {
      id: this.nid("rx"),
      atMs: this.state.clockMs,
      channelId: this.pack.radio.channelPrimary,
      direction: "dispatch_tx",
      from: this.state.consoleId,
      to: callsign,
      kind: "QUERY",
      caption: `${callsign}, status check`,
      incidentId: incidentId ?? u?.assignedIncidentId ?? undefined,
      unitId,
      requiresReadback: false,
      readbackSatisfiedAtMs: null,
      steppedOn: false,
      incomplete: false,
      templateId: "STATUS_QUERY",
      structured: { to_units: callsign, status: "query" },
    };
    this.applyChannelEmergencyGate("QUERY", radio.caption);
    this.state.radioLog.push(radio);
  }

  private injectRadio(cmd: Extract<PlayerCommand, { type: "InjectRadio" }>): void {
    const radio: RadioEvent = {
      id: this.nid("rx"),
      atMs: this.state.clockMs,
      channelId: cmd.channelId ?? this.pack.radio.channelPrimary,
      direction: cmd.direction ?? "unit_tx",
      from: cmd.from,
      to: cmd.to ?? this.state.consoleId,
      kind: cmd.kind ?? "STATUS",
      caption: cmd.caption,
      incidentId: cmd.incidentId,
      unitId: cmd.unitId,
      requiresReadback: cmd.requiresReadback ?? false,
      readbackSatisfiedAtMs: null,
      steppedOn: cmd.steppedOn ?? false,
      incomplete: cmd.incomplete ?? false,
    };
    this.state.radioLog.push(radio);
    this.state.simLog.push({
      id: this.nid("ev"),
      atMs: this.state.clockMs,
      kind: "inject",
      detail: `InjectRadio ${cmd.from}: ${cmd.caption}`,
    });
  }

  private setChannelEmergency(active: boolean, reason?: string): void {
    this.state.channelEmergency = active;
    const caption = active
      ? `Emergency traffic — ${reason ?? "channel hold"}`
      : `Emergency traffic clear — ${reason ?? "resume normal"}`;
    this.state.radioLog.push({
      id: this.nid("rx"),
      atMs: this.state.clockMs,
      channelId: this.pack.radio.channelPrimary,
      direction: "system",
      from: this.state.consoleId,
      to: null,
      kind: "EMERGENCY",
      caption,
      requiresReadback: false,
      readbackSatisfiedAtMs: null,
      steppedOn: false,
      incomplete: false,
      templateId: active ? "EMERGENCY_TRAFFIC_OPEN" : "EMERGENCY_TRAFFIC_CLEAR",
    });
  }

  private linkDuplicate(
    incidentId: string,
    primaryIncidentId: string,
    reason?: string
  ): void {
    const dup = this.getIncident(incidentId);
    const primary = this.getIncident(primaryIncidentId);
    if (!dup || !primary) return;
    if (incidentId === primaryIncidentId) return;
    dup.status = "LINKED_DUP";
    dup.linkedIncidentId = primaryIncidentId;
    dup.disposition = dup.disposition ?? "DUP";
    dup.clearedAtMs = this.state.clockMs;
    this.touchIncident(dup);
    this.touchIncident(primary);
    dup.notes.push({
      atMs: this.state.clockMs,
      author: "player",
      text: reason
        ? `Linked duplicate → ${primary.cfsNumber}: ${reason}`
        : `Linked duplicate → ${primary.cfsNumber}`,
    });
    primary.notes.push({
      atMs: this.state.clockMs,
      author: "system",
      text: `Duplicate CFS ${dup.cfsNumber} linked`,
    });
    for (const uid of [...dup.assignedUnitIds]) {
      const u = this.getUnit(uid);
      if (u) {
        u.assignedIncidentId = null;
        if (canTransitionStatus(u.status, "AVL")) {
          u.status = "AVL";
          u.statusChangedAtMs = this.state.clockMs;
        }
      }
    }
    dup.assignedUnitIds = [];
  }

  private clearIncident(incidentId: string, disposition: string): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;
    if (!disposition) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_NO_DISPOSITION",
        rubricId: "DOC_DISPOSITION",
        incidentId,
        message: "CFS closed without disposition code.",
        evidence: { expected: "disposition", actual: "none", ruleRef: "cad.disposition" },
      });
    }
    // Units still assigned in DIS/ER/OS
    for (const uid of inc.assignedUnitIds) {
      const u = this.getUnit(uid);
      if (u && (u.status === "DIS" || u.status === "ER" || u.status === "OS")) {
        this.grade({
          severity: "hard_fail",
          code: "FAIL_STATUS_DIRTY_CLOSE",
          rubricId: "STA_DIRTY_CLOSE",
          incidentId,
          unitId: uid,
          message: `Closed CFS with ${u.callsign} still ${u.status}.`,
          evidence: {
            expected: "units cleared/AVL",
            actual: u.status,
            ruleRef: "unit.close_hygiene",
          },
        });
      }
    }
    inc.disposition = disposition;
    inc.status = "CLEARED";
    inc.clearedAtMs = this.state.clockMs;
    // House law (S3-2 / DOCTRINE): CFS clear is an administrative force-clear.
    // Units are force-set AVL after dirty-close grades; not a silent laundering of illegal edges mid-call.
    for (const uid of [...inc.assignedUnitIds]) {
      const u = this.getUnit(uid);
      if (u) {
        u.status = "AVL";
        u.assignedIncidentId = null;
        u.statusChangedAtMs = this.state.clockMs;
      }
    }
    inc.notes.push({
      atMs: this.state.clockMs,
      author: "system",
      text: "CFS cleared — house law force-clear assigned units to AVL (dirty statuses already graded).",
    });
    inc.assignedUnitIds = [];
  }

  private cancelIncident(incidentId: string, disposition: string): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;
    inc.disposition = disposition;
    inc.status = "CANCELLED";
    inc.clearedAtMs = this.state.clockMs;
    for (const uid of [...inc.assignedUnitIds]) {
      const u = this.getUnit(uid);
      if (u) {
        u.status = "AVL";
        u.assignedIncidentId = null;
      }
    }
    inc.assignedUnitIds = [];
  }

  private holdIncident(incidentId: string, reason: string): void {
    const inc = this.getIncident(incidentId);
    if (!inc) return;
    if (priorityRank(inc.priority) <= 1) {
      this.grade({
        severity: "hard_fail",
        code: "FAIL_HOLD_HIGH_PRIORITY",
        rubricId: "TIM_HOLD_P1",
        incidentId,
        message: "Cannot stack/hold P0–P1 without supervisor path (not available in Phase 0).",
        evidence: { expected: "dispatch", actual: `hold: ${reason}`, ruleRef: "priority.stack" },
      });
    }
    if ((reason ?? "").trim().length < 8) {
      this.grade({
        severity: "soft",
        code: "SOFT_STACK_REASON_THIN",
        rubricId: "TIM_HOLD_THIN",
        incidentId,
        message: "Hold/stack reason thin — document why CFS is deferred.",
        evidence: {
          expected: "reason ≥8 chars",
          actual: reason,
          ruleRef: "priority.stack_reason",
        },
      });
    }
    inc.status = "HOLD";
    inc.notes.push({
      atMs: this.state.clockMs,
      author: "player",
      text: `HOLD: ${reason}`,
    });
  }

  private injectIncident(
    partial: Extract<PlayerCommand, { type: "InjectIncident" }>["incident"]
  ): void {
    const inc: Incident = {
      ...partial,
      status: partial.status ?? "PENDING",
      enteredAtMs: partial.enteredAtMs ?? null,
      priorityHistory: [],
      firstDispatchAtMs: null,
      firstEnRouteAtMs: null,
      firstOnSceneAtMs: null,
      lastUpdateAtMs: partial.receivedAtMs,
      clearedAtMs: null,
      assignedUnitIds: [],
      primaryUnitId: null,
      disposition: null,
      notes: [],
      flags: [...(partial.flags ?? [])],
    };
    this.state.incidents[inc.id] = inc;
    this.state.simLog.push({
      id: this.nid("ev"),
      atMs: this.state.clockMs,
      kind: "inject",
      detail: `InjectIncident ${inc.id}`,
    });
  }

  debrief(): Debrief {
    const hardFails = this.state.gradeLog.filter((g) => g.severity === "hard_fail");
    const softMarks = this.state.gradeLog.filter((g) => g.severity === "soft");
    const notes = this.state.gradeLog.filter((g) => g.severity === "note");
    const incidents = Object.values(this.state.incidents);
    const timeline = [
      ...this.state.simLog.map((e) => ({
        atMs: e.atMs,
        kind: "sim",
        summary: e.detail ?? e.kind,
      })),
      ...this.state.radioLog.map((r) => ({
        atMs: r.atMs,
        kind: "radio",
        summary: `${r.direction} ${r.from}→${r.to ?? ""}: ${r.caption}`,
      })),
      ...this.state.gradeLog.map((g) => ({
        atMs: g.atMs,
        kind: "grade",
        summary: `[${g.severity}] ${g.code}: ${g.message}`,
      })),
    ].sort((a, b) => a.atMs - b.atMs);

    return {
      scenarioId: this.state.scenarioId,
      seed: this.state.seed,
      clockMs: this.state.clockMs,
      passed: hardFails.length === 0,
      hardFails,
      softMarks,
      notes,
      timeline,
      metrics: {
        incidentsTotal: incidents.length,
        incidentsCleared: incidents.filter((i) => i.status === "CLEARED" || i.status === "CANCELLED")
          .length,
        dispatches: this.state.radioLog.filter((r) => r.kind === "DISPATCH").length,
        radioTx: this.state.radioLog.filter((r) => r.direction === "dispatch_tx").length,
      },
      disclaimer: DEBRIEF_DISCLAIMER,
    };
  }

  toSessionRecord(commands: Array<{ atMs: number; cmd: PlayerCommand }>): SessionRecord {
    return {
      schemaVersion: 1,
      scenarioId: this.state.scenarioId,
      packId: this.state.packId,
      packVersion: this.state.packVersion,
      seed: this.state.seed,
      engineVersion: ENGINE_VERSION,
      commands,
    };
  }
}

export function replaySession(
  pack: DoctrinePack,
  baseUnits: Unit[],
  baseIncidents: Incident[],
  record: SessionRecord
): { runtime: Runtime; debrief: Debrief } {
  const rt = new Runtime({
    pack,
    scenarioId: record.scenarioId,
    seed: record.seed,
    units: baseUnits,
    incidents: baseIncidents,
  });
  rt.applyAll(record.commands);
  return { runtime: rt, debrief: rt.debrief() };
}
