import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Runtime,
  A07_SCENARIO_CATALOG,
  materializeA07Scenario,
  createMasteryProfile,
  recordMasteryWatch,
  type PlayerCommand,
  type SectorState,
} from "@sector305/core";
import naturesJson from "../../../packs/miami-a07-police-v0/natures.json";
import radioJson from "../../../packs/miami-a07-police-v0/radio_templates.json";
import {
  LEGAL_NEXT,
  ASSIGNABLE,
  UNIT_STATUSES,
  type DoctrinePack,
} from "@sector305/core";
import { SectorMap } from "./SectorMap";
import { consoleAudio } from "./audio/consoleAudio";
import { radioSpeech } from "./audio/radioSpeech";
import { channelSfx } from "./audio/channelSfx";
import { shellMusic } from "./audio/shellMusic";
import { splashFxBed } from "./audio/splashFxBed";
import { ShellSplash } from "./components/ShellSplash";
import { ZuluClock } from "./components/ZuluClock";
import { ChannelBank, type RrChannel } from "./components/ChannelBank";
import { ActivityLog } from "./components/ActivityLog";
import { TxPresentStrip } from "./components/TxPresentStrip";
import { type FireToneEvent } from "./components/ApparatusStrip";
import { AgencyDesk } from "./components/AgencyDesk";
import { MapWorkspace } from "./components/MapWorkspace";
import { TrainingCoach } from "./components/TrainingCoach";
import { LiveGradeStrip } from "./components/LiveGradeStrip";
import { CueWindowHud } from "./components/CueWindowHud";
import { ScoreControlPanel } from "./components/ScoreControlPanel";
import { CfsCadSheet } from "./components/CfsCadSheet";
import { OpsPressureStrip } from "./components/OpsPressureStrip";
import { CommandBar } from "./components/CommandBar";
import { UnitStatusModal } from "./components/UnitStatusModal";
import type { UnitStatus } from "@sector305/core";
import {
  HOTKEY_HELP_ROWS,
  useConsoleHotkeys,
} from "./hooks/useConsoleHotkeys";
import {
  computeSla,
  formatMs,
  visibleIncidents,
} from "./gameplay/opsDesk";
import { HELO_LAYER_ID, TRAF_LAYER_ID } from "./geo/miamiBasemap";
import {
  loadMasteryProfile,
  saveMasteryProfile,
} from "./training/masteryStore";

/** CAD-style stack flavor for queue rows. */
type QueueLane = "pending" | "owned" | "working" | "hold" | "cleared";

function priRank(p: string): number {
  return ({ P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 } as Record<string, number>)[p] ?? 9;
}

function laneFor(
  status: string,
  id: string,
  owned: Set<string>,
  assigned: boolean
): QueueLane {
  if (status === "CLEARED" || status === "CANCELLED") return "cleared";
  if (status === "HOLD") return "hold";
  if (assigned || status === "DISPATCHED" || status === "ENROUTE" || status === "ONSCENE") {
    return "working";
  }
  if (owned.has(id)) return "owned";
  return "pending";
}

type Phase = "shell" | "booting" | "console" | "debrief";

const NATURES = (
  naturesJson as { natures: { code: string; label: string; defaultPriority: string }[] }
).natures;

/** Browser-safe pack assembly (no node:fs loadPack). */
function browserPack(): DoctrinePack {
  return {
    id: "miami-a07-police-v0",
    version: "0.2.0",
    title: "A07 Coastal / Central — Police A-Console (fictional)",
    localeDefault: "en",
    disclaimer:
      "Fictional training doctrine. Not official agency SOP. Not APCO/NENA/IAED certification.",
    consoleId: "A07",
    sectorId: "SE305-A07",
    priorities: [
      { code: "P0", name: "OFFICER EMERGENCY", dispatchSlaMs: 15000, stackAllowed: false, radioPreempt: "full" },
      { code: "P1", name: "IN PROGRESS LIFE/WEAPON", dispatchSlaMs: 60000, stackAllowed: false, radioPreempt: "high" },
      { code: "P2", name: "IN PROGRESS / URGENT", dispatchSlaMs: 120000, stackAllowed: false, radioPreempt: "medium" },
      { code: "P3", name: "PROMPT", dispatchSlaMs: 300000, stackAllowed: true, radioPreempt: "low" },
      { code: "P4", name: "ROUTINE", dispatchSlaMs: 900000, stackAllowed: true, radioPreempt: "none" },
      { code: "P5", name: "ADMIN / INFO", dispatchSlaMs: 3600000, stackAllowed: true, radioPreempt: "none" },
    ],
    unitStatuses: UNIT_STATUSES.map((code) => ({
      code,
      assignable: ASSIGNABLE[code],
      next: LEGAL_NEXT[code],
    })),
    natures: NATURES.map((n) => ({
      code: n.code,
      label: n.label,
      defaultPriority: n.defaultPriority as DoctrinePack["natures"][0]["defaultPriority"],
      requiresBackup: false,
      weaponsLikely: false,
      inProgressDefault: false,
    })),
    dispositions: [
      { code: "RPT", label: "Report taken" },
      { code: "GOA", label: "Gone on arrival" },
      { code: "UTL", label: "Unable to locate" },
      { code: "ADV", label: "Advised" },
      { code: "ARR", label: "Arrest" },
      { code: "UNF", label: "Unfounded" },
      { code: "CAN", label: "Cancelled" },
    ],
    radio: {
      channelPrimary: (radioJson as { channelPrimary: string }).channelPrimary ?? "SE305-PRI",
      plainLanguage: true,
      dispatchTemplate: "{units} {priority} {nature} {location}",
      readbackTimeoutMs: 45000,
      requiredDispatchElements: ["unit", "priority", "nature", "location"],
    },
    assignment: {
      minBackupUnitsP1: 2,
      allowOosAssign: false,
      requireVerifiedOrPartialForP1: true,
    },
    rubric: [],
    zones: [
      { id: "Z-OCEAN", name: "Ocean Drive corridor", jurisdictionId: "CITY-BEACH" },
      { id: "Z-COLLINS", name: "Collins Ave", jurisdictionId: "CITY-BEACH" },
      { id: "Z-DOWNTOWN", name: "Downtown", jurisdictionId: "CITY-MIA" },
      { id: "Z-WYNWOOD", name: "Wynwood", jurisdictionId: "CITY-MIA" },
      { id: "Z-PORT", name: "Port edge", jurisdictionId: "PORT" },
    ],
  };
}

const SCENARIO_STORAGE_KEY = "s305.scenarioId";

function readStoredScenarioId(): string {
  try {
    const id = localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (id && A07_SCENARIO_CATALOG.some((s) => s.id === id)) return id;
  } catch {
    /* ignore */
  }
  return "checkride_a07_ocean_robbery_v1";
}

function createScenarioRuntime(scenarioId: string): Runtime {
  const { entry, units, incidents } = materializeA07Scenario(scenarioId);
  return new Runtime({
    pack: browserPack(),
    scenarioId: entry.id,
    seed: entry.seed,
    units,
    incidents,
  });
}

function soundForCommand(c: PlayerCommand): void {
  switch (c.type) {
    case "DispatchUnits":
      // Baked ElevenLabs caption when catalog match; else key-up / roger
      void radioSpeech.playCaption({
        caption: c.radioCaption ?? "",
        kind: "DISPATCH",
        direction: "dispatch_tx",
      });
      break;
    case "UnitRadioRx":
      void radioSpeech.playCaption({
        caption: c.caption ?? "",
        kind: c.kind ?? "ACK",
        direction: "unit_tx",
      });
      break;
    case "RadioTx":
      // Template TX — speech after render would need slots; key-up only for now
      shellMusic.duckForRadio(1500);
      consoleAudio.play("radioKey");
      break;
    case "RadioTxFreeform":
      void radioSpeech.playCaption({
        caption: c.caption,
        kind: c.kind,
        direction: "dispatch_tx",
      });
      break;
    case "ClearIncident":
      consoleAudio.play("clear");
      break;
    case "VerifyLocation":
      consoleAudio.play("ding");
      break;
    case "SetPriority":
      if (c.priority === "P0" || c.priority === "P1") consoleAudio.play("alertHi");
      else consoleAudio.play("ui");
      break;
    case "SetFlag":
    case "SetNature":
      consoleAudio.play("ui");
      break;
    case "Advance":
      consoleAudio.play("tick");
      break;
    case "SetUnitStatus":
      consoleAudio.play("ui");
      break;
    default:
      consoleAudio.play("ui");
  }
}

export function App() {
  const [phase, setPhase] = useState<Phase>("shell");
  const [masteryProfile, setMasteryProfile] = useState(() => loadMasteryProfile());
  const [watchId] = useState(() =>
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `watch-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  const [completedAtIso, setCompletedAtIso] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState(() => readStoredScenarioId());
  const [rt, setRt] = useState(() => createScenarioRuntime(readStoredScenarioId()));
  const [state, setState] = useState<SectorState>(() => rt.snapshot());
  const [selectedId, setSelectedId] = useState<string | null>("cfs-001");
  const [sessionCmds, setSessionCmds] = useState<
    Array<{ atMs: number; cmd: PlayerCommand }>
  >([]);
  const [radioDraft, setRadioDraft] = useState(
    "3A12, 3A14, P1 robbery in progress, 1400 block Ocean Drive, weapon reported"
  );
  const [muted, setMuted] = useState(() => consoleAudio.isMuted());
  const [musicMuted, setMusicMuted] = useState(() => shellMusic.isMusicMuted());
  const [musicReady, setMusicReady] = useState(false);
  const [scoreTitle, setScoreTitle] = useState(() =>
    shellMusic.getCurrentTrackTitle()
  );
  /** Dispatcher has taken the call (ACK/select) — suppresses new-call flavor. */
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => new Set(["cfs-001"]));
  const [watchChannel, setWatchChannel] = useState<RrChannel | null>(null);
  const [mapDockW, setMapDockW] = useState(380);
  const [mapDockH, setMapDockH] = useState<number | null>(null);
  const [fireLog, setFireLog] = useState<FireToneEvent[]>([]);
  const [heloSeen, setHeloSeen] = useState(false);
  const [trafficSeen, setTrafficSeen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [hotkeyHelp, setHotkeyHelp] = useState(false);
  const [scoreControlsOpen, setScoreControlsOpen] = useState(false);
  /** Real-time sim clock — pause is first-class training control. */
  const [liveSim, setLiveSim] = useState(false);
  const [statusModalUnitId, setStatusModalUnitId] = useState<string | null>(
    null
  );
  /** Field unit radio scripts fire at sim clock (ACK / enroute / on-scene). */
  const fieldScriptRef = useRef<
    Array<{
      id: string;
      fireAtMs: number;
      done: boolean;
      run: () => void;
    }>
  >([]);
  const seenRingInsRef = useRef<Set<string>>(new Set());
  const cmdRef = useRef<(c: PlayerCommand) => void>(() => {});
  const debrief = useMemo(
    () => (phase === "debrief" ? rt.debrief() : null),
    [phase, state, rt]
  );
  const projectedMastery = useMemo(() => {
    if (!debrief || !completedAtIso) return masteryProfile;
    return recordMasteryWatch(
      masteryProfile,
      debrief,
      watchId,
      completedAtIso
    );
  }, [debrief, completedAtIso, masteryProfile, watchId]);

  useEffect(() => {
    if (projectedMastery === masteryProfile) return;
    saveMasteryProfile(projectedMastery);
    setMasteryProfile(projectedMastery);
  }, [projectedMastery, masteryProfile]);

  useEffect(
    () =>
      shellMusic.subscribe(() => {
        setScoreTitle(shellMusic.getCurrentTrackTitle());
      }),
    []
  );

  // Debrief sting when entering AAR
  useEffect(() => {
    if (phase !== "debrief" || !debrief) return;
    consoleAudio.stopAmbient();
    consoleAudio.play(debrief.passed ? "pass" : "fail");
    const scoreTimer = window.setTimeout(() => {
      shellMusic.transitionToDebriefBed();
    }, 450);
    return () => window.clearTimeout(scoreTimer);
  }, [phase, debrief?.passed]);

  // Open channel hiss while glass is live
  useEffect(() => {
    if (phase === "console" && !muted) {
      consoleAudio.startAmbient();
    } else if (phase !== "console") {
      consoleAudio.stopAmbient();
    }
    return () => {
      if (phase !== "console") consoleAudio.stopAmbient();
    };
  }, [phase, muted]);

  // Probe theme on shell; force music path unmuted so title can play
  useEffect(() => {
    if (phase === "shell") {
      shellMusic.forceUnmute();
      setMusicMuted(false);
      shellMusic.setMasterMuted(false);
      void shellMusic.enable().then(() => {
        setMusicReady(shellMusic.hasTrack());
        void shellMusic.play();
      });
    }
  }, [phase]);

  function cmd(c: PlayerCommand) {
    const atMs = rt.snapshot().clockMs;
    const gradesBefore = rt.snapshot().gradeLog.length;
    const notesBefore = Object.values(rt.snapshot().incidents).reduce(
      (n, inc) => n + inc.notes.length,
      0
    );
    rt.apply(c);
    const next = rt.snapshot();
    setSessionCmds((prev) => [...prev, { atMs, cmd: c }]);
    setState(next);
    soundForCommand(c);
    // hard-fail chirp if grader just wrote one
    const newGrades = next.gradeLog.slice(gradesBefore);
    if (newGrades.some((g) => g.severity === "hard_fail")) {
      window.setTimeout(() => consoleAudio.play("fail"), 120);
    } else if (newGrades.some((g) => g.severity === "soft")) {
      window.setTimeout(() => consoleAudio.play("ding"), 80);
    }
    // New CT / knowable notes → frantic 911 caller bed (after user is on glass)
    const newCallerNotes: string[] = [];
    for (const inc of Object.values(next.incidents)) {
      for (const note of inc.notes) {
        if (note.author !== "call_taker" && note.author !== "system") continue;
        if (note.atMs < atMs && c.type !== "Advance") continue;
        // Prefer notes that just landed at/after prior clock
        if (note.atMs >= atMs || c.type === "Advance") {
          newCallerNotes.push(note.text);
        }
      }
    }
    // De-dupe and play first strong match (don't stack scream-over-scream)
    const unique = [...new Set(newCallerNotes)].slice(-3);
    if (unique.length && notesBefore < Object.values(next.incidents).reduce((n, i) => n + i.notes.length, 0)) {
      const latest = unique[unique.length - 1]!;
      void radioSpeech.playCallerFromNote(latest);
    }

    // Schedule field radio after player dispatch (units talk on *their* clock)
    if (c.type === "DispatchUnits") {
      const fireClock = next.clockMs;
      for (const uid of c.unitIds) {
        const cs = next.units[uid]?.callsign ?? uid;
        const base = `${c.incidentId}:${uid}:${fireClock}`;
        fieldScriptRef.current.push(
          {
            id: `${base}:ack`,
            fireAtMs: fireClock + 2800,
            done: false,
            run: () => {
              cmdRef.current({
                type: "UnitRadioRx",
                unitId: uid,
                incidentId: c.incidentId,
                caption: `${cs}, responding.`,
                kind: "ACK",
              });
            },
          },
          {
            id: `${base}:er`,
            fireAtMs: fireClock + 14000,
            done: false,
            run: () => {
              cmdRef.current({
                type: "UnitRadioRx",
                unitId: uid,
                incidentId: c.incidentId,
                caption: `${cs}, en route.`,
                kind: "STATUS",
              });
            },
          },
          {
            id: `${base}:os`,
            fireAtMs: fireClock + 42000,
            done: false,
            run: () => {
              cmdRef.current({
                type: "UnitRadioRx",
                unitId: uid,
                incidentId: c.incidentId,
                caption: `${cs} on scene`,
                kind: "STATUS",
              });
            },
          }
        );
      }
    }

    // Drain field scripts due by new clock
    const due = fieldScriptRef.current.filter(
      (e) => !e.done && next.clockMs >= e.fireAtMs
    );
    for (const e of due) {
      e.done = true;
      // defer so we don't re-enter apply mid-stack
      queueMicrotask(() => e.run());
    }
  }
  cmdRef.current = cmd;

  function exportSession() {
    consoleAudio.play("export");
    const rec = {
      schemaVersion: 1 as const,
      scenarioId: state.scenarioId,
      packId: state.packId,
      packVersion: state.packVersion,
      seed: state.seed,
      engineVersion: "0.2.0",
      commands: sessionCmds,
    };
    const blob = new Blob([JSON.stringify(rec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session_${state.scenarioId}_${state.seed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function selectCfs(id: string) {
    const wasOwned = ownedIds.has(id);
    if (id !== selectedId) {
      // Paisley Ponytail soft desk chime on focus; first ACK also "takes" the call
      consoleAudio.play("ding");
    }
    if (!wasOwned) {
      setOwnedIds((prev) => new Set(prev).add(id));
      // first ownership: quiet channel chirp (not the urgent new-call bank)
      if (id !== selectedId) {
        window.setTimeout(() => consoleAudio.play("ui"), 90);
      }
    }
    setSelectedId(id);
    setSelectedUnitId(null);
  }

  function selectUnit(id: string | null) {
    if (id && id !== selectedUnitId) consoleAudio.play("ui");
    setSelectedUnitId(id);
  }

  async function toggleMute() {
    await consoleAudio.unlock();
    const next = consoleAudio.toggleMute();
    setMuted(next);
    shellMusic.setMasterMuted(next);
    if (!next) {
      consoleAudio.play("ui");
      if (phase === "console") consoleAudio.startAmbient();
      if (phase === "shell" || phase === "booting") {
        void shellMusic.enable().then(() => setMusicReady(shellMusic.hasTrack()));
      }
    }
  }

  async function toggleShellMusic() {
    await consoleAudio.unlock();
    const next = shellMusic.toggleMusicMuted();
    setMusicMuted(next);
    if (!next) {
      void shellMusic.enable().then(() => setMusicReady(shellMusic.hasTrack()));
    }
  }

  function resetMastery() {
    const next = createMasteryProfile();
    saveMasteryProfile(next);
    setMasteryProfile(next);
    consoleAudio.play("ui");
  }

  async function radioTest() {
    await consoleAudio.unlock();
    if (consoleAudio.isMuted()) {
      consoleAudio.setMuted(false);
      setMuted(false);
      if (phase === "console") consoleAudio.startAmbient();
    }
    consoleAudio.radioTest();
  }

  const selected = selectedId ? state.incidents[selectedId] : null;
  const packPri = browserPack().priorities;
  /** Staged ring-in: only CFS that have arrived by sim clock. */
  const incidents = useMemo(
    () =>
      visibleIncidents(Object.values(state.incidents), state.clockMs),
    [state.incidents, state.clockMs]
  );
  const units = Object.values(state.units);

  // LIVE sim cadence — 1s real → 1s sim; pause is first-class
  useEffect(() => {
    if (phase !== "console" || !liveSim) return;
    const id = window.setInterval(() => {
      cmdRef.current({ type: "Advance", ms: 1000 });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, liveSim]);

  // Seed ring-in set on watch open so t=0 CFS don't all "ring"
  useEffect(() => {
    if (phase !== "console") return;
    for (const inc of Object.values(rt.snapshot().incidents)) {
      if (inc.receivedAtMs <= rt.snapshot().clockMs) {
        seenRingInsRef.current.add(inc.id);
      }
    }
  }, [phase, rt]);

  // New CFS ring-in SFX when staged arrival crosses clock
  useEffect(() => {
    if (phase !== "console") return;
    for (const inc of Object.values(state.incidents)) {
      if (inc.receivedAtMs > state.clockMs) continue;
      if (seenRingInsRef.current.has(inc.id)) continue;
      seenRingInsRef.current.add(inc.id);
      consoleAudio.play("alertHi");
      window.setTimeout(() => consoleAudio.play("ding"), 180);
    }
  }, [state.clockMs, state.incidents, phase]);

  const robberyNatureCode = useMemo(() => {
    const hit = NATURES.find(
      (n) =>
        n.code.toUpperCase().includes("ROBB") ||
        n.label.toUpperCase().includes("ROBBERY")
    );
    return hit?.code ?? NATURES[0]?.code ?? "ROBBERY-IP";
  }, []);

  const dispatchTwo = useCallback(() => {
    if (!selectedId) return;
    const snap = rt.snapshot();
    const available = Object.values(snap.units)
      .filter((u) => u.status === "AVL" && u.type === "patrol")
      .slice(0, 2)
      .map((u) => u.id);
    cmd({
      type: "DispatchUnits",
      incidentId: selectedId,
      unitIds: available.length ? available : ["u-3a12"],
      radioCaption: radioDraft,
    });
  }, [selectedId, radioDraft, rt]);

  const simAcks = useCallback(() => {
    if (!selectedId) return;
    const snap = rt.snapshot();
    const inc = snap.incidents[selectedId];
    if (!inc) return;
    for (const uid of inc.assignedUnitIds) {
      const cs = snap.units[uid]?.callsign ?? uid;
      // House air: "3A12, responding." — bake unit_*_responding next pass
      cmd({
        type: "UnitRadioRx",
        unitId: uid,
        incidentId: selectedId,
        caption: `${cs}, responding.`,
        kind: "ACK",
      });
    }
  }, [selectedId, rt]);

  const simOnScene = useCallback(() => {
    if (!selectedId) return;
    const snap = rt.snapshot();
    const inc = snap.incidents[selectedId];
    if (!inc) return;
    for (const uid of inc.assignedUnitIds) {
      cmd({
        type: "UnitRadioRx",
        unitId: uid,
        incidentId: selectedId,
        caption: `${snap.units[uid]?.callsign} on scene`,
        kind: "STATUS",
      });
    }
  }, [selectedId, rt]);

  const clearWithDisposition = useCallback(
    (disposition: string) => {
      if (!selectedId) return;
      const snap = rt.snapshot();
      const inc = snap.incidents[selectedId];
      if (!inc) return;
      for (const uid of [...inc.assignedUnitIds]) {
        cmd({ type: "SetUnitStatus", unitId: uid, status: "CLR" });
        cmd({ type: "SetUnitStatus", unitId: uid, status: "AVL" });
      }
      cmd({
        type: "ClearIncident",
        incidentId: selectedId,
        disposition,
      });
    },
    [selectedId, rt]
  );

  const clearGoa = useCallback(() => {
    clearWithDisposition("GOA");
  }, [clearWithDisposition]);

  const endDebrief = useCallback(() => {
    consoleAudio.stopAmbient();
    consoleAudio.play("ui");
    setCompletedAtIso((current) => current ?? new Date().toISOString());
    setPhase("debrief");
  }, []);

  // Keyboard-first M16 path (UI_ACCEPTANCE #20) — ? toggles help
  // Desktop File → Open .305 (preload bridge); full library switch is next
  useEffect(() => {
    const api = (
      window as unknown as {
        sector305Desktop?: {
          onOpenScenarioPack?: (h: (p: unknown) => void) => () => void;
        };
      }
    ).sector305Desktop;
    if (!api?.onOpenScenarioPack) return;
    return api.onOpenScenarioPack((pack) => {
      try {
        localStorage.setItem("s305.lastOpened305", JSON.stringify(pack));
        consoleAudio.play("assign");
        // eslint-disable-next-line no-console
        console.info("[SECTOR 305] Loaded .305 pack (stored). Full switch TBD.", pack);
      } catch {
        /* ignore */
      }
    });
  }, []);

  useConsoleHotkeys(phase === "console", {
    onSelectIndex: (i: number) => {
      const snap = rt.snapshot();
      const list = visibleIncidents(
        Object.values(snap.incidents),
        snap.clockMs
      );
      const hit = list[i];
      if (hit) selectCfs(hit.id);
    },
    onVerify: () => {
      if (!selectedId) return;
      const inc = rt.snapshot().incidents[selectedId];
      if (!inc) return;
      // Scenario-general: verify to this CFS truth location (not Ocean-only macros)
      const truth = inc.truth?.actualLocation;
      cmd({
        type: "VerifyLocation",
        incidentId: selectedId,
        confidence: "verified",
        location: truth
          ? {
              freeform: truth.freeform,
              block: truth.block,
              street: truth.street,
              zoneId: truth.zoneId,
              city: truth.city,
            }
          : {
              freeform: inc.location.freeform,
              block: inc.location.block,
              street: inc.location.street,
              zoneId: inc.location.zoneId,
            },
      });
    },
    onPriorityP1: () => {
      if (!selectedId) return;
      cmd({ type: "SetPriority", incidentId: selectedId, priority: "P1" });
    },
    onNatureRobbery: () => {
      if (!selectedId) return;
      cmd({
        type: "SetNature",
        incidentId: selectedId,
        natureCode: robberyNatureCode,
      });
    },
    onFlagWeapons: () => {
      if (!selectedId) return;
      cmd({
        type: "SetFlag",
        incidentId: selectedId,
        flag: "WEAPONS",
        value: true,
      });
    },
    onFlagBackup: () => {
      if (!selectedId) return;
      cmd({
        type: "SetFlag",
        incidentId: selectedId,
        flag: "NEEDS_BACKUP",
        value: true,
      });
    },
    onDispatch2: () => dispatchTwo(),
    onAck: () => simAcks(),
    onOnScene: () => simOnScene(),
    onClearGoa: () => clearGoa(),
    onAdvance5: () => cmd({ type: "Advance", ms: 5000 }),
    onAdvance30: () => cmd({ type: "Advance", ms: 30000 }),
    onDebrief: () => endDebrief(),
    onExport: () => exportSession(),
    onToggleHelp: () => setHotkeyHelp((v) => !v),
  });

  // Space = LIVE/PAUSE (not while typing)
  useEffect(() => {
    if (phase !== "console") return;
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space" && e.key !== " ") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      e.preventDefault();
      setLiveSim((v) => {
        const next = !v;
        consoleAudio.play(next ? "channelUp" : "ui");
        return next;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  async function openWatch() {
    await consoleAudio.unlock();
    fieldScriptRef.current = [];
    seenRingInsRef.current = new Set();
    setLiveSim(false);
    // Warm radio/phone buses before glass (manifests + hot clip decode)
    void radioSpeech.ensureLoaded().then(() => {
      void radioSpeech.prewarmHot(56);
    });
    void channelSfx.ensureLoaded().then(() => {
      void channelSfx.prewarm();
    });
    splashFxBed.stop();
    // Long cinematic fade of title theme, then boot into glass
    if (musicReady && !musicMuted && !muted) {
      if (!shellMusic.snapshot().playing) await shellMusic.play();
      shellMusic.transitionToWatchBed(4.5, state.seed);
    } else {
      shellMusic.disableSlow(0.4);
    }
    // Delay boot stingers so they don’t stomp the fade
    setPhase("booting");
    window.setTimeout(() => {
      consoleAudio.play("boot");
    }, 900);
    window.setTimeout(() => {
      consoleAudio.play("channelUp");
      setPhase("console");
      window.setTimeout(() => {
        // Prefer baked radio crackle; synth fallback inside channelSfx/consoleAudio
        void channelSfx.play("radio_crackle_soft", 0.32).then((ok) => {
          if (!ok) consoleAudio.play("radioCrackle");
        });
        consoleAudio.startAmbient();
      }, 280);
    }, 2800);
  }

  if (phase === "shell" || phase === "booting") {
    return (
      <ShellSplash
        booting={phase === "booting"}
        musicReady={musicReady}
        muted={muted}
        musicMuted={musicMuted}
        mastery={masteryProfile}
        scenarioId={scenarioId}
        scenarios={A07_SCENARIO_CATALOG}
        onSelectScenario={(id) => {
          try {
            localStorage.setItem(SCENARIO_STORAGE_KEY, id);
          } catch {
            /* ignore */
          }
          setScenarioId(id);
          const nextRt = createScenarioRuntime(id);
          setRt(nextRt);
          setState(nextRt.snapshot());
          setSessionCmds([]);
          setSelectedId(
            Object.keys(nextRt.snapshot().incidents)[0] ?? null
          );
          setOwnedIds(new Set());
          consoleAudio.play("ui");
        }}
        onResetMastery={resetMastery}
        onBegin={() => void openWatch()}
        onToggleSfx={() => void toggleMute()}
        onToggleMusic={() => void toggleShellMusic()}
      />
    );
  }

  if (phase === "debrief" && debrief) {
    const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
    const nextFocus = projectedMastery.focus;
    const resultWord = debrief.passed ? "PASS" : "FAIL";
    const qualWord = debrief.passed ? "QUALIFIED" : "NOT QUALIFIED";
    return (
      <div
        className={`debrief prestige-debrief aar-debrief ${debrief.passed ? "pass" : "fail"}`}
      >
        <article className="debrief-frame aar-frame" aria-label="After-action report">
          <header className="aar-letterhead">
            <div className="aar-brand mono">
              <div className="aar-product">SECTOR 305</div>
              <div className="aar-org">COLDBRICKS · TRAINING INSTRUMENT</div>
            </div>
            <div className="aar-classification mono">
              TRAINING USE ONLY · NOT AN OFFICIAL CERTIFICATE
            </div>
          </header>

          <div className="aar-title-block">
            <div className="aar-form-id mono">FORM S305-AAR · AFTER-ACTION REPORT</div>
            <h1>A-CONSOLE CHECKRIDE EVALUATION</h1>
            <div className={`aar-result-band ${debrief.passed ? "pass" : "fail"}`}>
              <span className="aar-result-k mono">RESULT</span>
              <span className="aar-result-v">{resultWord}</span>
              <span className="aar-result-qual mono">{qualWord}</span>
            </div>
          </div>

          <div className="aar-meta-grid mono">
            <div>
              <span className="aar-mk">SCENARIO</span>
              <span className="aar-mv">{debrief.scenarioId}</span>
            </div>
            <div>
              <span className="aar-mk">SEED</span>
              <span className="aar-mv">{debrief.seed}</span>
            </div>
            <div>
              <span className="aar-mk">SIM CLOCK</span>
              <span className="aar-mv">T+{(debrief.clockMs / 1000).toFixed(1)}s</span>
            </div>
            <div>
              <span className="aar-mk">EXPORT</span>
              <span className="aar-mv">{stamp}Z</span>
            </div>
            <div>
              <span className="aar-mk">WATCH ID</span>
              <span className="aar-mv">{watchId.slice(0, 8)}…</span>
            </div>
            <div>
              <span className="aar-mk">PROFILE</span>
              <span className="aar-mv">
                {projectedMastery.watchesCompleted} WATCH
                {projectedMastery.watchesCompleted === 1 ? "" : "ES"} ·{" "}
                {projectedMastery.cleanWatches} CLEAN
              </span>
            </div>
          </div>

          <section className="aar-section">
            <h2 className="aar-h">
              1 · Critical findings{" "}
              <span className="aar-count">({debrief.hardFails.length})</span>
            </h2>
            {debrief.hardFails.length === 0 ? (
              <p className="ok-line aar-none">None recorded.</p>
            ) : (
              <table className="aar-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>CODE</th>
                    <th>FINDING</th>
                    <th>RUBRIC</th>
                  </tr>
                </thead>
                <tbody>
                  {debrief.hardFails.map((f) => (
                    <tr key={f.id}>
                      <td className="mono">+{(f.atMs / 1000).toFixed(1)}s</td>
                      <td className="mono fail-code">{f.code}</td>
                      <td>{f.message}</td>
                      <td className="mono dim">{f.rubricId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="aar-section">
            <h2 className="aar-h">
              2 · Coaching · soft marks{" "}
              <span className="aar-count">({debrief.softMarks.length})</span>
            </h2>
            {debrief.softBand ? (
              <p className="dim-line mono aar-band-note">
                SOFT BAND · {debrief.softBand.label} · weight {debrief.softBand.weight}/
                {debrief.softBand.ceiling}
              </p>
            ) : null}
            {debrief.softMarks.length === 0 ? (
              <p className="dim-line aar-none">None.</p>
            ) : (
              <table className="aar-table soft">
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>NOTE</th>
                  </tr>
                </thead>
                <tbody>
                  {debrief.softMarks.map((f) => (
                    <tr key={f.id}>
                      <td className="mono fail-code">{f.code}</td>
                      <td>{f.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="aar-section">
            <h2 className="aar-h">3 · Watch metrics</h2>
            <div className="metric-grid aar-metrics">
              <div className="metric">
                <span className="mk">INCIDENTS</span>
                <span className="mv">{debrief.metrics.incidentsTotal}</span>
              </div>
              <div className="metric">
                <span className="mk">CLEARED</span>
                <span className="mv">{debrief.metrics.incidentsCleared}</span>
              </div>
              <div className="metric">
                <span className="mk">DISPATCH</span>
                <span className="mv">{debrief.metrics.dispatches}</span>
              </div>
              <div className="metric">
                <span className="mk">RADIO TX</span>
                <span className="mv">{debrief.metrics.radioTx}</span>
              </div>
            </div>
          </section>

          <section className="aar-section">
            <h2 className="aar-h">4 · Evaluation timeline</h2>
            {debrief.timeline.length === 0 ? (
              <p className="dim-line aar-none">No timeline events.</p>
            ) : (
              <ol className="aar-timeline">
                {debrief.timeline.map((ev, i) => (
                  <li key={`${ev.atMs}-${ev.kind}-${i}`} className={`tl-${ev.kind}`}>
                    <span className="aar-tl-t mono">+{(ev.atMs / 1000).toFixed(1)}s</span>
                    <span className="aar-tl-k mono">{ev.kind}</span>
                    <span className="aar-tl-m">{ev.summary}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section
            className={`aar-section aar-next mode-${nextFocus.mode}`}
            aria-labelledby="next-watch-title"
          >
            <h2 className="aar-h" id="next-watch-title">
              5 · Next watch directive
            </h2>
            <div className="dn-kicker mono">FOCUS · {nextFocus.label}</div>
            <h3 className="aar-next-title">{nextFocus.title}</h3>
            <p className="aar-next-brief">{nextFocus.brief}</p>
          </section>

          <footer className="aar-signature mono">
            <div className="aar-sig-line">
              <span>EVALUATOR</span>
              <span className="aar-sig-blank">INSTRUMENT / SELF-REVIEW</span>
            </div>
            <div className="aar-sig-line">
              <span>OPERATOR</span>
              <span className="aar-sig-blank">________________</span>
            </div>
            <div className="aar-sig-line">
              <span>DATE</span>
              <span className="aar-sig-blank">{stamp}Z</span>
            </div>
          </footer>

          <div className="actions debrief-actions aar-actions">
            <button type="button" className="primary" onClick={() => window.location.reload()}>
              Open next watch
            </button>
            <button type="button" onClick={exportSession}>
              Export SessionRecord
            </button>
          </div>
          <p className="disclaimer aar-disclaimer">{debrief.disclaimer}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="console prestige-console instrument-desk">
      <div className="topbar instrument-topbar">
        <div className="tb-left">
          <div className="tb-brand">
            <span className="tb-live" aria-hidden>
              ●
            </span>
            <div className="tb-brand-stack">
              <span className="tb-product mono">SECTOR 305</span>
              <span className="id">
                {state.consoleId} · {state.sectorId}
              </span>
            </div>
          </div>
          <div className="tb-chips">
            <span className="tb-chip">A-CONSOLE</span>
            <span className="tb-chip">SE305-PRI</span>
            <span className="tb-chip dim">CHECKRIDE</span>
            <span className="tb-chip dim mono">SEED {state.seed}</span>
          </div>
        </div>

        <ZuluClock simMs={state.clockMs} className="topbar-zulu" />

        <div className="tb-right">
          <div className="tb-sim mono" title="Simulation clock (scenario time)">
            <span className="tb-sim-k">SIM</span>
            <span className="tb-sim-v">T+{(state.clockMs / 1000).toFixed(1)}s</span>
          </div>
          <div className="tb-actions instrument-keys">
            <button
              type="button"
              className={`audio-toggle tb-key ${muted ? "is-muted" : ""}`}
              onClick={() => void toggleMute()}
              title={muted ? "Unmute SFX" : "Mute SFX"}
              aria-pressed={!muted}
            >
              {muted ? "SFX OFF" : "SFX"}
            </button>
            <button
              type="button"
              className="tb-key"
              onClick={() => void radioTest()}
              title="Radio path self-test"
            >
              R/T
            </button>
            <button
              type="button"
              className={`tb-key tb-score ${musicMuted ? "is-muted" : ""}`}
              aria-label="Scenario score bed"
              aria-pressed={!musicMuted}
              onClick={() => void toggleShellMusic()}
              title="Low scenario music bed; ducks automatically under radio traffic"
            >
              BED
            </button>
            <button
              type="button"
              className={`tb-key tb-score-desk ${scoreControlsOpen ? "is-open" : ""}`}
              aria-label="Score controls"
              aria-expanded={scoreControlsOpen}
              onClick={() => setScoreControlsOpen((open) => !open)}
              title={`Scenario score controls · ${scoreTitle}`}
            >
              SCORE
            </button>
            <button type="button" className="tb-key" onClick={() => cmd({ type: "Advance", ms: 5000 })}>
              +5s
            </button>
            <button type="button" className="tb-key" onClick={() => cmd({ type: "Advance", ms: 30000 })}>
              +30s
            </button>
            <button type="button" className="tb-key" onClick={exportSession}>
              EXPORT
            </button>
            <button
              type="button"
              className="tb-key tb-help"
              onClick={() => setHotkeyHelp((v) => !v)}
              title="Keyboard map (?)"
            >
              KEYS
            </button>
            <button type="button" className="danger tb-key tb-end" onClick={() => endDebrief()}>
              DEBRIEF
            </button>
          </div>
        </div>
      </div>

      <ScoreControlPanel
        open={scoreControlsOpen}
        musicMuted={musicMuted}
        onClose={() => setScoreControlsOpen(false)}
        onToggleMusic={() => void toggleShellMusic()}
      />

      <LiveGradeStrip
        gradeLog={state.gradeLog}
        focus={masteryProfile.focus}
        scoreTitle={scoreTitle}
      />

      <OpsPressureStrip
        clockMs={state.clockMs}
        incidents={incidents}
        liveSim={liveSim}
        packPriorities={packPri}
        onToggleLive={() => {
          setLiveSim((v) => {
            const next = !v;
            consoleAudio.play(next ? "channelUp" : "ui");
            return next;
          });
        }}
      />

      <CommandBar
        selectedIncidentId={selectedId}
        units={units}
        radioDraft={radioDraft}
        onCmd={cmd}
      />

      <UnitStatusModal
        open={!!statusModalUnitId}
        unit={
          statusModalUnitId
            ? units.find((u) => u.id === statusModalUnitId) ?? null
            : null
        }
        cfsHint={
          selected
            ? `${selected.cfsNumber} · ${selected.priority}`
            : null
        }
        onClose={() => setStatusModalUnitId(null)}
        onSetStatus={(unitId, status: UnitStatus) => {
          cmd({ type: "SetUnitStatus", unitId, status });
        }}
      />

      {hotkeyHelp ? (
        <div className="hotkey-help" role="dialog" aria-label="Keyboard map">
          <div className="hotkey-help-inner">
            <div className="hh-head mono">
              <span>KEYBOARD · M16 PATH</span>
              <button type="button" onClick={() => setHotkeyHelp(false)}>
                CLOSE
              </button>
            </div>
            <table className="hh-table mono">
              <tbody>
                {HOTKEY_HELP_ROWS.map((row) => (
                  <tr key={row.keys}>
                    <td className="hh-keys">{row.keys}</td>
                    <td>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hh-note">
              Disabled while typing in caption/fields. Instrument path only —
              no mic required.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid console-grid dense instrument-grid">
        <div className="panel queue-panel instrument-panel">
          <h2>
            <span className="h2-title">Incident queue</span>
            <span className="h2-meta mono">
              CAD · PRI THEN AGE · ACK SUPPRESSES
            </span>
          </h2>
          <CueWindowHud
            clockMs={state.clockMs}
            schedule={selected?.truth?.knowableSchedule}
          />
          {(
            [
              ["pending", "PENDING · UNAKED"],
              ["owned", "OWNED · ACK"],
              ["working", "WORKING · DISPATCHED"],
              ["hold", "HOLD"],
              ["cleared", "CLEARED"],
            ] as const
          ).map(([lane, label]) => {
            const rows = incidents
              .filter((inc) => {
                const assigned = (inc.assignedUnitIds?.length ?? 0) > 0;
                return laneFor(inc.status, inc.id, ownedIds, assigned) === lane;
              })
              .sort((a, b) => {
                const pr = priRank(a.priority) - priRank(b.priority);
                if (pr !== 0) return pr;
                return a.receivedAtMs - b.receivedAtMs;
              });
            if (rows.length === 0) return null;
            return (
              <div key={lane} className={`queue-lane lane-${lane}`}>
                <div className="queue-lane-h mono">{label}</div>
                {rows.map((inc) => {
                  const age = (state.clockMs - inc.receivedAtMs) / 1000;
                  const assigned = (inc.assignedUnitIds?.length ?? 0) > 0;
                  const sla = computeSla(inc, state.clockMs, packPri);
                  const pct = Math.min(100, Math.round(sla.ratio * 100));
                  return (
                    <button
                      type="button"
                      key={inc.id}
                      className={`queue-item lane-${lane} sla-${sla.band} pri-row-${inc.priority} ${selectedId === inc.id ? "active" : ""} ${lane === "pending" && sla.band !== "na" && sla.ratio < 0.15 ? "is-new" : ""}`}
                      onClick={() => selectCfs(inc.id)}
                    >
                      <div className="qi-top">
                        <span className={`pri pri-${inc.priority}`}>{inc.priority}</span>
                        <strong>{inc.cfsNumber}</strong>
                        <span className="qi-age mono">
                          {sla.band === "na"
                            ? `${age.toFixed(0)}s`
                            : sla.band === "breach"
                              ? "BREACH"
                              : formatMs(sla.remainMs)}
                        </span>
                      </div>
                      {sla.band !== "na" ? (
                        <div
                          className={`qi-sla-bar band-${sla.band}`}
                          title={`Dispatch SLA ${formatMs(sla.slaMs)} · age ${formatMs(sla.ageMs)}`}
                        >
                          <i style={{ width: `${pct}%` }} />
                        </div>
                      ) : null}
                      <div className="qi-nature">{inc.natureText}</div>
                      <div className="qi-loc">{inc.location.freeform}</div>
                      <div className="qi-meta mono">
                        {inc.status}
                        {ownedIds.has(inc.id) ? " · ACK" : " · NEW"}
                        {assigned ? " · UNITS" : ""}
                        {" · "}
                        {inc.locationConfidence}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <CfsCadSheet
          selected={selected}
          units={units}
          radioDraft={radioDraft}
          onRadioDraft={setRadioDraft}
          natures={NATURES}
          dispositions={browserPack().dispositions}
          onCmd={cmd}
          onDispatchTwo={() => dispatchTwo()}
          onDispatchOne={() => {
            if (!selected) return;
            const available = units.find((u) => u.status === "AVL");
            if (!available) return;
            cmd({
              type: "DispatchUnits",
              incidentId: selected.id,
              unitIds: [available.id],
              radioCaption: radioDraft,
            });
          }}
          onSimAcks={() => simAcks()}
          onSimOnScene={() => simOnScene()}
          onClearGoa={() => clearGoa()}
          onClearWithDisposition={(code) => clearWithDisposition(code)}
        />

        <div className="panel agency-panel instrument-panel">
          <AgencyDesk
            units={units}
            incidents={state.incidents}
            selectedUnitId={selectedUnitId}
            onSelectUnit={selectUnit}
            onStatusRequest={(id) => setStatusModalUnitId(id)}
            clockMs={state.clockMs}
            selectedCfsLabel={
              selected ? `${selected.cfsNumber} · ${selected.priority}` : null
            }
            onFireToneOut={(ev) => {
              setFireLog((prev) => [ev, ...prev].slice(0, 12));
            }}
            fireLog={fireLog}
            pdFooter={
              <>
                <h2 style={{ marginTop: 10, marginBottom: 4 }}>Timers</h2>
                <div className="radio-log">
                  {incidents
                    .filter((i) => i.status === "PENDING" || i.status === "HOLD")
                    .map((i) => {
                      const age = state.clockMs - i.receivedAtMs;
                      return (
                        <div key={i.id} className="radio-line">
                          {i.cfsNumber} {i.priority} age {(age / 1000).toFixed(0)}
                          s · {i.locationConfidence}
                        </div>
                      );
                    })}
                  {state.radioLog
                    .filter((r) => r.requiresReadback && !r.readbackSatisfiedAtMs)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="radio-line"
                        style={{ color: "var(--amber)" }}
                      >
                        READBACK pending · {r.caption.slice(0, 48)}…
                      </div>
                    ))}
                </div>
              </>
            }
          />
        </div>

        <div
          className={`panel map-panel instrument-panel ${mapDockH != null ? "map-panel-custom-h" : ""}`}
          style={{
            // Outer window chrome — must match MapWorkspace dock size exactly
            width: mapDockW,
            minWidth: mapDockW,
            maxWidth: mapDockW,
            flex: `0 0 ${mapDockW}px`,
            ...(mapDockH != null
              ? {
                  height: mapDockH,
                  minHeight: mapDockH,
                  maxHeight: mapDockH,
                  alignSelf: "start",
                }
              : {
                  height: "100%",
                  minHeight: 0,
                  maxHeight: "none",
                }),
          }}
        >
          <MapWorkspace
            onDockSize={(s) => {
              setMapDockW(s.width);
              setMapDockH(s.height);
            }}
          >
            <SectorMap
              incidents={incidents}
              units={units}
              selectedId={selectedId}
              selectedUnitId={selectedUnitId}
              clockMs={state.clockMs}
              sectorId={state.sectorId}
              onSelectCfs={selectCfs}
              onSelectUnit={selectUnit}
              onRadarVisibility={(vis) => {
                if (vis[HELO_LAYER_ID]) setHeloSeen(true);
                if (vis[TRAF_LAYER_ID]) setTrafficSeen(true);
              }}
            />
          </MapWorkspace>
        </div>

        {phase === "console" && (
          <TrainingCoach
            state={state}
            focus={masteryProfile.focus}
            selectedId={selectedId}
            ownedIds={ownedIds}
            fireDispatches={fireLog.length}
            heloSeen={heloSeen}
            trafficSeen={trafficSeen}
            onAdvanceSim={(ms) => cmd({ type: "Advance", ms })}
          />
        )}

        <div className="panel bottom-rail instrument-panel instrument-rail">
          <div className="bottom-rail-grid">
            <div className="br-col br-activity">
              <ActivityLog
                events={state.radioLog}
                resourceLabel={
                  watchChannel?.alpha ??
                  (radioJson as { channelPrimary: string }).channelPrimary
                }
                watchMeta={
                  watchChannel
                    ? `${watchChannel.tone || "CSQ"} · ${watchChannel.mode} · ${watchChannel.tag}`
                    : null
                }
              />
              <TxPresentStrip
                radioLog={state.radioLog}
                resourceLabel={
                  watchChannel?.alpha ??
                  (radioJson as { channelPrimary: string }).channelPrimary
                }
              />
            </div>
            <div className="br-col">
              <h2>Live grades</h2>
              <div className="radio-log">
                {state.gradeLog.length === 0 && (
                  <div className="radio-line">No grade events yet</div>
                )}
                {state.gradeLog.map((g) => (
                  <div key={g.id} className="radio-line">
                    <span
                      style={{
                        color:
                          g.severity === "hard_fail"
                            ? "var(--red)"
                            : g.severity === "soft"
                              ? "var(--amber)"
                              : "var(--muted)",
                      }}
                    >
                      [{g.severity}] {g.code}
                    </span>{" "}
                    {g.message}
                  </div>
                ))}
              </div>
            </div>
            <div className="br-col br-chan">
              <ChannelBank
                activeAlpha={watchChannel?.alpha}
                onSelect={(ch) => {
                  setWatchChannel(ch);
                  consoleAudio.play("radioKey");
                  window.setTimeout(() => consoleAudio.play("radioCrackle"), 60);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="footer mono">
        <span className="ft-main">
          SECTOR 305 · A-CONSOLE · {liveSim ? "LIVE SIM" : "PAUSED"}
        </span>
        <span className="ft-sep">·</span>
        <span>
          SPACE LIVE · KEYS <kbd>?</kbd>
        </span>
        <span className="ft-sep">·</span>
        <span>FIELD RADIO AUTO AFTER DISPATCH</span>
        <span className="ft-sep">·</span>
        <span className="ft-dim">TRAINING FICTION ONLY · NOT A REAL CERT</span>
      </div>
    </div>
  );
}
