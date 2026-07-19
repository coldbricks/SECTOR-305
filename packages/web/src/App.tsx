import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Runtime,
  A07_SCENARIO_CATALOG,
  materializeA07Scenario,
  createMasteryProfile,
  recordMasteryWatch,
  type PlayerCommand,
  type PriorityCode,
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
import { type FireToneEvent } from "./components/ApparatusStrip";
import { AgencyDesk } from "./components/AgencyDesk";
import { MapWorkspace } from "./components/MapWorkspace";
import { TrainingCoach } from "./components/TrainingCoach";
import { LiveGradeStrip } from "./components/LiveGradeStrip";
import { CueWindowHud } from "./components/CueWindowHud";
import { RadioCaptionMeter } from "./components/RadioCaptionMeter";
import { ScoreControlPanel } from "./components/ScoreControlPanel";
import {
  HOTKEY_HELP_ROWS,
  useConsoleHotkeys,
} from "./hooks/useConsoleHotkeys";
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
  }

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
  const incidents = Object.values(state.incidents).sort(
    (a, b) => a.receivedAtMs - b.receivedAtMs
  );
  const units = Object.values(state.units);

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
      cmd({
        type: "UnitRadioRx",
        unitId: uid,
        incidentId: selectedId,
        caption: `${snap.units[uid]?.callsign} copy, en route`,
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

  const clearGoa = useCallback(() => {
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
      disposition: "GOA",
    });
  }, [selectedId, rt]);

  const endDebrief = useCallback(() => {
    consoleAudio.stopAmbient();
    consoleAudio.play("ui");
    setCompletedAtIso((current) => current ?? new Date().toISOString());
    setPhase("debrief");
  }, []);

  // Keyboard-first M16 path (UI_ACCEPTANCE #20) — ? toggles help
  useConsoleHotkeys(phase === "console", {
    onSelectIndex: (i: number) => {
      const list = Object.values(rt.snapshot().incidents).sort(
        (a, b) => a.receivedAtMs - b.receivedAtMs
      );
      const hit = list[i];
      if (hit) selectCfs(hit.id);
    },
    onVerify: () => {
      if (!selectedId) return;
      cmd({
        type: "VerifyLocation",
        incidentId: selectedId,
        confidence: "verified",
        location: {
          freeform: "1400 block Ocean Drive",
          block: "1400",
          street: "Ocean Drive",
          zoneId: "Z-OCEAN",
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

  async function openWatch() {
    await consoleAudio.unlock();
    // Warm radio/phone buses before glass (manifests + optional baked SFX)
    void radioSpeech.ensureLoaded();
    void channelSfx.ensureLoaded();
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
    return (
      <div className={`debrief prestige-debrief ${debrief.passed ? "pass" : "fail"}`}>
        <div className="debrief-frame">
          <header className="debrief-header">
            <div>
              <div className="dh-kicker">S305 · AFTER-ACTION · TRAINING</div>
              <h1>{debrief.passed ? "CHECKRIDE · PASS" : "CHECKRIDE · FAIL"}</h1>
            </div>
            <div className={`dh-stamp ${debrief.passed ? "ok" : "bad"}`}>
              {debrief.passed ? "QUALIFIED" : "NOT QUALIFIED"}
            </div>
          </header>
          <div className="debrief-meta mono">
            <span>SCENARIO {debrief.scenarioId}</span>
            <span>SEED {debrief.seed}</span>
            <span>T+{(debrief.clockMs / 1000).toFixed(1)}s</span>
            <span>EXPORT {stamp}Z</span>
          </div>

          <section className="debrief-section">
            <h2>Critical findings · hard fails ({debrief.hardFails.length})</h2>
            {debrief.hardFails.length === 0 ? (
              <p className="ok-line">None recorded.</p>
            ) : (
              <ul className="fail-list">
                {debrief.hardFails.map((f) => (
                  <li key={f.id}>
                    <div className="fail-code">{f.code}</div>
                    <div className="fail-msg">{f.message}</div>
                    <div className="fail-meta mono">
                      +{(f.atMs / 1000).toFixed(1)}s · {f.rubricId}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="debrief-section">
            <h2>Coaching · soft marks ({debrief.softMarks.length})</h2>
            {debrief.softBand ? (
              <p className="dim-line mono" style={{ marginBottom: "0.5rem" }}>
                SOFT BAND · {debrief.softBand.label} · weight {debrief.softBand.weight}/
                {debrief.softBand.ceiling}
              </p>
            ) : null}
            {debrief.softMarks.length === 0 ? (
              <p className="dim-line">None.</p>
            ) : (
              <ul className="fail-list soft">
                {debrief.softMarks.map((f) => (
                  <li key={f.id}>
                    <div className="fail-code">{f.code}</div>
                    <div className="fail-msg">{f.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="debrief-section">
            <h2>Watch metrics</h2>
            <div className="metric-grid">
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

          <section className="debrief-section">
            <h2>Evaluation timeline · chronological</h2>
            {debrief.timeline.length === 0 ? (
              <p className="dim-line">No timeline events.</p>
            ) : (
              <ul className="fail-list aar-timeline">
                {debrief.timeline.map((ev, i) => (
                  <li key={`${ev.atMs}-${ev.kind}-${i}`} className={`tl-${ev.kind}`}>
                    <div className="fail-meta mono">
                      +{(ev.atMs / 1000).toFixed(1)}s · {ev.kind}
                    </div>
                    <div className="fail-msg">{ev.summary}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className={`debrief-next mode-${nextFocus.mode}`}
            aria-labelledby="next-watch-title"
          >
            <div className="dn-kicker">NEXT WATCH · {nextFocus.label}</div>
            <h2 id="next-watch-title">{nextFocus.title}</h2>
            <p>{nextFocus.brief}</p>
            <div className="dn-ledger mono">
              PROFILE · {projectedMastery.watchesCompleted} WATCH
              {projectedMastery.watchesCompleted === 1 ? "" : "ES"} OBSERVED ·{" "}
              {projectedMastery.cleanWatches} CLEAN
            </div>
          </section>

          <div className="actions debrief-actions">
            <button className="primary" onClick={() => window.location.reload()}>
              Run it cleaner
            </button>
            <button onClick={exportSession}>Export SessionRecord</button>
          </div>
          <p className="disclaimer">{debrief.disclaimer}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="console prestige-console">
      <div className="topbar">
        <div className="tb-left">
          <div className="tb-brand">
            <span className="tb-live">●</span>
            <span className="id">
              {state.consoleId} · {state.sectorId}
            </span>
          </div>
          <div className="tb-chips">
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
          <div className="tb-actions">
            <button
              type="button"
              className={`audio-toggle tb-audio ${muted ? "is-muted" : ""}`}
              onClick={() => void toggleMute()}
              title={muted ? "Unmute" : "Mute"}
              aria-pressed={!muted}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              type="button"
              className="tb-radio-test"
              onClick={() => void radioTest()}
              title="Radio path self-test"
            >
              R/T
            </button>
            <button
              type="button"
              className={`tb-score ${musicMuted ? "is-muted" : ""}`}
              aria-label="Scenario score"
              aria-pressed={!musicMuted}
              onClick={() => void toggleShellMusic()}
              title="Low scenario music bed; ducks automatically under radio traffic"
            >
              BED
            </button>
            <button
              type="button"
              className={`tb-score-desk ${scoreControlsOpen ? "is-open" : ""}`}
              aria-label="Score controls"
              aria-expanded={scoreControlsOpen}
              onClick={() => setScoreControlsOpen((open) => !open)}
              title={`Scenario score controls · ${scoreTitle}`}
            >
              ♫
            </button>
            <button onClick={() => cmd({ type: "Advance", ms: 5000 })}>+5s</button>
            <button onClick={() => cmd({ type: "Advance", ms: 30000 })}>+30s</button>
            <button onClick={exportSession}>Export</button>
            <button
              type="button"
              className="tb-help"
              onClick={() => setHotkeyHelp((v) => !v)}
              title="Keyboard map (?)"
            >
              ?
            </button>
            <button className="danger" onClick={() => endDebrief()}>
              End / Debrief
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

      <div className="grid console-grid dense">
        <div className="panel queue-panel">
          <h2>
            Incident queue
            <span className="h2-meta mono">
              CAD · PRI THEN AGE · ACK SUPPRESSES
            </span>
          </h2>
          <CueWindowHud clockMs={state.clockMs} />
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
                  return (
                    <button
                      type="button"
                      key={inc.id}
                      className={`queue-item lane-${lane} ${selectedId === inc.id ? "active" : ""} ${lane === "pending" ? "is-new" : ""}`}
                      onClick={() => selectCfs(inc.id)}
                    >
                      <div className="qi-top">
                        <span className={`pri pri-${inc.priority}`}>{inc.priority}</span>
                        <strong>{inc.cfsNumber}</strong>
                        <span className="qi-age mono">{age.toFixed(0)}s</span>
                      </div>
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

        <div className="panel cfs-panel">
          <h2>CFS detail</h2>
          {!selected ? (
            <p style={{ color: "var(--muted)" }}>Select a CFS</p>
          ) : (
            <div className="form-grid">
              <div>
                <strong>{selected.cfsNumber}</strong> · {selected.id}
              </div>
              <label>
                Priority
                <select
                  value={selected.priority}
                  onChange={(e) =>
                    cmd({
                      type: "SetPriority",
                      incidentId: selected.id,
                      priority: e.target.value as PriorityCode,
                    })
                  }
                >
                  {["P0", "P1", "P2", "P3", "P4", "P5"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nature
                <select
                  value={selected.natureCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    cmd({
                      type: "SetNature",
                      incidentId: selected.id,
                      natureCode: code,
                    });
                  }}
                >
                  {NATURES.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.code} — {n.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Location (display)
                <input readOnly value={selected.location.freeform} />
              </label>
              <div className="actions">
                <button
                  onClick={() =>
                    cmd({
                      type: "VerifyLocation",
                      incidentId: selected.id,
                      confidence: "verified",
                      location: {
                        freeform: "1400 block Ocean Drive",
                        block: "1400",
                        street: "Ocean Drive",
                        zoneId: "Z-OCEAN",
                      },
                    })
                  }
                >
                  Verify → 1400 Ocean (truth)
                </button>
                <button
                  onClick={() =>
                    cmd({
                      type: "SetFlag",
                      incidentId: selected.id,
                      flag: "WEAPONS",
                      value: true,
                    })
                  }
                >
                  Flag WEAPONS
                </button>
                <button
                  onClick={() =>
                    cmd({
                      type: "SetFlag",
                      incidentId: selected.id,
                      flag: "NEEDS_BACKUP",
                      value: true,
                    })
                  }
                >
                  Flag BACKUP
                </button>
              </div>
              <label>
                Dispatch radio caption
                <textarea
                  rows={3}
                  value={radioDraft}
                  onChange={(e) => setRadioDraft(e.target.value)}
                />
              </label>
              <RadioCaptionMeter caption={radioDraft} />
              <div className="actions">
                <button className="primary" onClick={() => dispatchTwo()}>
                  Dispatch 2× AVL patrol
                </button>
                <button
                  onClick={() => {
                    const available = units.find((u) => u.status === "AVL");
                    if (!available) return;
                    cmd({
                      type: "DispatchUnits",
                      incidentId: selected.id,
                      unitIds: [available.id],
                      radioCaption: radioDraft,
                    });
                  }}
                >
                  Dispatch 1× (risk)
                </button>
                <button onClick={() => simAcks()}>Sim unit ACKs</button>
                <button onClick={() => simOnScene()}>Sim on scene</button>
                <button onClick={() => clearGoa()}>Clear GOA</button>
              </div>
              <h2 style={{ marginTop: 12 }}>CAD notes</h2>
              <div className="radio-log">
                {selected.notes.map((n, i) => (
                  <div key={i} className="radio-line">
                    +{(n.atMs / 1000).toFixed(1)}s [{n.author}] {n.text}
                  </div>
                ))}
              </div>
              <p style={{ color: "var(--muted)", fontSize: 11 }}>
                Flags: {selected.flags.join(", ") || "—"} · Truth is hidden
                (grader only)
              </p>
            </div>
          )}
        </div>

        <div className="panel agency-panel">
          <AgencyDesk
            units={units}
            incidents={state.incidents}
            selectedUnitId={selectedUnitId}
            onSelectUnit={selectUnit}
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
          className={`panel map-panel ${mapDockH != null ? "map-panel-custom-h" : ""}`}
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

        <div className="panel bottom-rail">
          <div className="bottom-rail-grid">
            <div className="br-col">
              <h2>
                Radio log ·{" "}
                {watchChannel?.alpha ??
                  (radioJson as { channelPrimary: string }).channelPrimary}
              </h2>
              {watchChannel && (
                <div className="watch-ch mono">
                  {watchChannel.freqMHz?.toFixed(4)} MHz · {watchChannel.mode} ·{" "}
                  {watchChannel.tone || "CSQ"} · {watchChannel.tag}
                </div>
              )}
              <div className="radio-log">
                {state.radioLog.length === 0 && (
                  <div className="radio-line">Channel quiet</div>
                )}
                {state.radioLog.map((r) => (
                  <div key={r.id} className="radio-line">
                    +{(r.atMs / 1000).toFixed(1)}s {r.from}→{r.to ?? "ALL"}{" "}
                    <span className="cap">{r.caption}</span>
                    {r.requiresReadback && !r.readbackSatisfiedAtMs
                      ? " ⚠ READBACK"
                      : r.readbackSatisfiedAtMs
                        ? " · ACK"
                        : ""}
                  </div>
                ))}
              </div>
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

      <div className="footer">
        SECTOR 305 · instrument checkride · live grades · keys{" "}
        <kbd>?</kbd> · CAD ACK · training fiction only · not a real cert
      </div>
    </div>
  );
}
