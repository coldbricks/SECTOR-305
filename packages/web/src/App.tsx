import { useMemo, useState } from "react";
import {
  Runtime,
  baseUnitsA07,
  incidentRobberyBadAddress,
  incidentTheftReport,
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

function createCheckride(): Runtime {
  return new Runtime({
    pack: browserPack(),
    scenarioId: "checkride_a07_ocean_robbery_v1",
    seed: 305001,
    units: baseUnitsA07(),
    incidents: [incidentRobberyBadAddress(), incidentTheftReport()],
  });
}

export function App() {
  const [phase, setPhase] = useState<Phase>("shell");
  const [rt] = useState(() => createCheckride());
  const [state, setState] = useState<SectorState>(() => rt.snapshot());
  const [selectedId, setSelectedId] = useState<string | null>("cfs-001");
  const [sessionCmds, setSessionCmds] = useState<
    Array<{ atMs: number; cmd: PlayerCommand }>
  >([]);
  const [radioDraft, setRadioDraft] = useState(
    "3A12, 3A14, P1 robbery in progress, 1400 block Ocean Drive, weapon reported"
  );
  const debrief = useMemo(
    () => (phase === "debrief" ? rt.debrief() : null),
    [phase, state, rt]
  );

  function cmd(c: PlayerCommand) {
    const atMs = rt.snapshot().clockMs;
    rt.apply(c);
    const next = rt.snapshot();
    setSessionCmds((prev) => [...prev, { atMs, cmd: c }]);
    setState(next);
  }

  function exportSession() {
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

  const selected = selectedId ? state.incidents[selectedId] : null;
  const incidents = Object.values(state.incidents).sort(
    (a, b) => a.receivedAtMs - b.receivedAtMs
  );
  const units = Object.values(state.units);

  function openWatch() {
    setPhase("booting");
    window.setTimeout(() => setPhase("console"), 1600);
  }

  if (phase === "shell" || phase === "booting") {
    return (
      <div className={`shell prestige ${phase === "booting" ? "is-booting" : ""}`}>
        <div className="shell-bg" aria-hidden>
          <div className="shell-grid" />
          <div className="shell-scan" />
          <div className="shell-glow pink" />
          <div className="shell-glow cyan" />
        </div>
        <div className="shell-card prestige-card">
          <div className="shell-card-edge" />
          <div className="tag">
            <span className="tag-dot" /> Miami fiction · A-console · S305
          </div>
          <div className="wordmark">
            <span className="wm-sector">SECTOR</span>
            <span className="wm-num">305</span>
          </div>
          <p className="tagline">
            Complexity that grades you. Graphics that don’t apologize.
          </p>
          <p className="lede">
            Certification-grade PSAP training instrument. South Beach on the
            shell. Ruthless glass on the watch. Process fails — not story
            points.
          </p>
          <div className="mission-strip">
            <div className="mission-item">
              <span className="mi-k">CHECKRIDE</span>
              <span className="mi-v">Ocean corridor · robbery IP</span>
            </div>
            <div className="mission-item">
              <span className="mi-k">LOAD</span>
              <span className="mi-v">C1 · C2 · C4 · C5 · C10</span>
            </div>
            <div className="mission-item">
              <span className="mi-k">CONSOLE</span>
              <span className="mi-v">DADE A07 · SE305-PRI</span>
            </div>
          </div>
          <div className="row">
            <button
              className="primary prestige-cta"
              disabled={phase === "booting"}
              onClick={openWatch}
            >
              {phase === "booting" ? "LINKING SECTOR…" : "OPEN WATCH · A07"}
            </button>
          </div>
          {phase === "booting" && (
            <div className="boot-rail" aria-live="polite">
              <div className="boot-line">AUTH · TRAINEE SESSION</div>
              <div className="boot-line">PACK · miami-a07-police-v0</div>
              <div className="boot-line">PLATE · IMPERFECT LAST-KNOWN</div>
              <div className="boot-line accent">CHANNEL · SE305-PRI UP</div>
              <div className="boot-bar">
                <span />
              </div>
            </div>
          )}
          <p className="disclaimer" style={{ marginTop: "1.25rem" }}>
            Training fiction only. Not a real telecommunicator certification.
            Not affiliated with any agency or APCO/NENA/IAED.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "debrief" && debrief) {
    const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
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

          <div className="actions debrief-actions">
            <button className="primary" onClick={() => window.location.reload()}>
              New session
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
        <div className="tb-brand">
          <span className="tb-live">●</span>
          <span className="id">
            {state.consoleId} · {state.sectorId}
          </span>
        </div>
        <span className="tb-chip">SE305-PRI</span>
        <span className="tb-chip dim">CHECKRIDE</span>
        <span className="clock mono">
          SIM {(state.clockMs / 1000).toFixed(1)}s · seed {state.seed}
        </span>
        <div className="tb-actions">
          <button onClick={() => cmd({ type: "Advance", ms: 5000 })}>+5s</button>
          <button onClick={() => cmd({ type: "Advance", ms: 30000 })}>+30s</button>
          <button onClick={exportSession}>Export</button>
          <button className="danger" onClick={() => setPhase("debrief")}>
            End / Debrief
          </button>
        </div>
      </div>

      <div className="grid console-grid">
        <div className="panel">
          <h2>Incident queue</h2>
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={`queue-item ${selectedId === inc.id ? "active" : ""}`}
              onClick={() => setSelectedId(inc.id)}
            >
              <span className={`pri pri-${inc.priority}`}>{inc.priority}</span>
              <strong>{inc.cfsNumber}</strong>
              <div style={{ color: "var(--muted)", marginTop: 4 }}>
                {inc.natureText}
              </div>
              <div style={{ marginTop: 2 }}>{inc.location.freeform}</div>
              <div style={{ marginTop: 4, fontSize: 11 }}>
                {inc.status} · loc {inc.locationConfidence}
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
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
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => {
                    const available = units
                      .filter((u) => u.status === "AVL" && u.type === "patrol")
                      .slice(0, 2)
                      .map((u) => u.id);
                    cmd({
                      type: "DispatchUnits",
                      incidentId: selected.id,
                      unitIds: available.length ? available : ["u-3a12"],
                      radioCaption: radioDraft,
                    });
                  }}
                >
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
                <button
                  onClick={() => {
                    for (const uid of selected.assignedUnitIds) {
                      cmd({
                        type: "UnitRadioRx",
                        unitId: uid,
                        incidentId: selected.id,
                        caption: `${state.units[uid]?.callsign} copy, en route`,
                        kind: "ACK",
                      });
                    }
                  }}
                >
                  Sim unit ACKs
                </button>
                <button
                  onClick={() => {
                    for (const uid of selected.assignedUnitIds) {
                      cmd({
                        type: "UnitRadioRx",
                        unitId: uid,
                        incidentId: selected.id,
                        caption: `${state.units[uid]?.callsign} on scene`,
                        kind: "STATUS",
                      });
                    }
                  }}
                >
                  Sim on scene
                </button>
                <button
                  onClick={() => {
                    for (const uid of [...selected.assignedUnitIds]) {
                      cmd({ type: "SetUnitStatus", unitId: uid, status: "CLR" });
                      cmd({ type: "SetUnitStatus", unitId: uid, status: "AVL" });
                    }
                    cmd({
                      type: "ClearIncident",
                      incidentId: selected.id,
                      disposition: "GOA",
                    });
                  }}
                >
                  Clear GOA
                </button>
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

        <div className="panel">
          <h2>Unit status</h2>
          {units.map((u) => (
            <div key={u.id} className="unit-row">
              <span>{u.callsign}</span>
              <span className={`st-${u.status}`}>{u.status}</span>
              <span style={{ color: "var(--muted)" }}>
                {u.assignedIncidentId
                  ? state.incidents[u.assignedIncidentId]?.cfsNumber
                  : u.zoneId}
              </span>
            </div>
          ))}
          <h2 style={{ marginTop: 12 }}>Timers</h2>
          <div className="radio-log">
            {incidents
              .filter((i) => i.status === "PENDING" || i.status === "HOLD")
              .map((i) => {
                const age = state.clockMs - i.receivedAtMs;
                return (
                  <div key={i.id} className="radio-line">
                    {i.cfsNumber} {i.priority} age {(age / 1000).toFixed(0)}s ·{" "}
                    {i.locationConfidence}
                  </div>
                );
              })}
            {state.radioLog
              .filter((r) => r.requiresReadback && !r.readbackSatisfiedAtMs)
              .map((r) => (
                <div key={r.id} className="radio-line" style={{ color: "var(--amber)" }}>
                  READBACK pending · {r.caption.slice(0, 48)}…
                </div>
              ))}
          </div>
        </div>

        <div className="panel map-panel">
          <SectorMap
            incidents={incidents}
            units={units}
            selectedId={selectedId}
            clockMs={state.clockMs}
            sectorId={state.sectorId}
            onSelectCfs={setSelectedId}
          />
        </div>

        <div className="panel" style={{ gridColumn: "1 / -1" }}>
          <h2>Radio log · {(radioJson as { channelPrimary: string }).channelPrimary}</h2>
          <div className="radio-log">
            {state.radioLog.length === 0 && (
              <div className="radio-line">Channel quiet</div>
            )}
            {state.radioLog.map((r) => (
              <div key={r.id} className="radio-line">
                +{(r.atMs / 1000).toFixed(1)}s {r.from}→{r.to ?? "ALL"}{" "}
                <span className="cap">{r.caption}</span>
                {r.requiresReadback && !r.readbackSatisfiedAtMs ? " ⚠ READBACK" : ""}
              </div>
            ))}
          </div>
          <h2 style={{ marginTop: 12 }}>Live grades</h2>
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
      </div>

      <div className="footer">
        SECTOR 305 · text radio Phase 0 · STT disabled · shell≠glass · not a
        real cert
      </div>
    </div>
  );
}
