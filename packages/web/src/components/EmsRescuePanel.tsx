import { useEffect, useMemo, useState } from "react";
import { consoleAudio } from "../audio/consoleAudio";

export type EmsRescueUnit = {
  id: string;
  callsign: string;
  station: string;
  zoneId: string;
  capability: string[];
};

export type EmsHospital = {
  id: string;
  name: string;
  alpha: string;
  freqMHz: number;
  tone: string;
  level: string;
  divert: boolean;
};

export type EmsAir = {
  id: string;
  callsign: string;
  pad: string;
  status: string;
};

type Board = {
  agency: string;
  disclaimer: string;
  rescues: EmsRescueUnit[];
  airRescue: EmsAir[];
  hospitals: EmsHospital[];
};

export type EmsUnitStatus = "AVL" | "DIS" | "ER" | "OS" | "TRN" | "OOS";

export type EmsEvent = {
  atMs: number;
  kind: "tone" | "hospital" | "air" | "status";
  text: string;
};

type Props = {
  clockMs: number;
  selectedCfsLabel?: string | null;
  onEvent?: (ev: EmsEvent) => void;
  /** Hide outer chrome when nested under AgencyDesk EMS tab. */
  compact?: boolean;
};

const STATUS_CYCLE: EmsUnitStatus[] = ["AVL", "DIS", "ER", "OS", "TRN", "AVL"];

/** Rescue / EMS board — MEDCOM hospitals + rescue units + air rescue. */
export function EmsRescuePanel({
  clockMs,
  selectedCfsLabel,
  onEvent,
  compact = false,
}: Props) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<"rescue" | "hospital" | "air">("rescue");
  const [status, setStatus] = useState<Record<string, EmsUnitStatus>>({});
  const [selectedRescue, setSelectedRescue] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [divert, setDivert] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<EmsEvent[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/geo/miami/ems-board.json", { signal: ac.signal })
      .then((r) => r.json())
      .then((j: Board) => {
        setBoard(j);
        const st: Record<string, EmsUnitStatus> = {};
        for (const u of j.rescues) st[u.id] = "AVL";
        // sprinkle a couple busy units for board realism
        if (j.rescues[2]) st[j.rescues[2].id] = "OS";
        if (j.rescues[5]) st[j.rescues[5].id] = "ER";
        setStatus(st);
        const d: Record<string, boolean> = {};
        for (const h of j.hospitals) d[h.id] = h.divert;
        setDivert(d);
      })
      .catch(() => setBoard(null));
    return () => ac.abort();
  }, []);

  const avlCount = useMemo(() => {
    if (!board) return 0;
    return board.rescues.filter((r) => status[r.id] === "AVL").length;
  }, [board, status]);

  function pushLog(kind: EmsEvent["kind"], text: string) {
    const ev: EmsEvent = { atMs: clockMs, kind, text };
    setLog((prev) => [ev, ...prev].slice(0, 8));
    onEvent?.(ev);
  }

  function toneRescue(u: EmsRescueUnit) {
    if (busy) return;
    setBusy(true);
    setSelectedRescue(u.id);
    void consoleAudio.unlock();
    consoleAudio.fireStationAlert({ stationId: u.station });
    setStatus((s) => ({ ...s, [u.id]: "DIS" }));
    const cfs = selectedCfsLabel ? ` · ${selectedCfsLabel}` : "";
    pushLog("tone", `${u.callsign} tone-out${cfs} · ${u.station}`);
    window.setTimeout(() => {
      setStatus((s) => ({ ...s, [u.id]: s[u.id] === "DIS" ? "ER" : s[u.id]! }));
      setBusy(false);
    }, 2200);
  }

  function cycleStatus(id: string) {
    setStatus((s) => {
      const cur = s[id] ?? "AVL";
      const i = STATUS_CYCLE.indexOf(cur);
      const next = STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]!;
      return { ...s, [id]: next };
    });
    consoleAudio.play("ui");
  }

  function medcomKey(h: EmsHospital) {
    setSelectedHospital(h.id);
    void consoleAudio.unlock();
    consoleAudio.play("radioKey");
    window.setTimeout(() => consoleAudio.play("radioCrackle"), 70);
    pushLog(
      "hospital",
      `MEDCOM · ${h.name} · ${h.freqMHz.toFixed(4)} · ${h.tone}${
        divert[h.id] ? " · DIVERT" : ""
      }`
    );
  }

  function toggleDivert(id: string) {
    setDivert((d) => {
      const next = !d[id];
      pushLog("status", `DIVERT ${next ? "ON" : "OFF"} · ${id}`);
      return { ...d, [id]: next };
    });
    consoleAudio.play("ui");
  }

  function launchAir(a: EmsAir) {
    void consoleAudio.unlock();
    consoleAudio.play("heloPass");
    window.setTimeout(() => consoleAudio.play("radioCrackle"), 200);
    pushLog("air", `${a.callsign} · ${a.pad} · launch request (train)`);
  }

  if (!board) {
    return (
      <div className="ems-panel">
        <div className="ems-head">RESCUE / EMS · …</div>
      </div>
    );
  }

  return (
    <div
      className={`ems-panel ${compact ? "compact" : ""}`}
      title={board.disclaimer}
    >
      {!compact && (
        <div className="ems-head">
          <span>RESCUE / EMS</span>
          <span className="mono dim">
            AVL {avlCount}/{board.rescues.length}
          </span>
        </div>
      )}
      {compact && (
        <div className="ems-subhead mono">
          RESCUE AVL {avlCount}/{board.rescues.length} · MEDCOM · AIR
        </div>
      )}

      <div className="ems-tabs">
        {(
          [
            ["rescue", "RESCUE"],
            ["hospital", "MEDCOM"],
            ["air", "AIR"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "on" : ""}
            onClick={() => {
              setTab(id);
              consoleAudio.play("ui");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "rescue" && (
        <ul className="ems-list">
          {board.rescues.map((u) => {
            const st = status[u.id] ?? "AVL";
            return (
              <li key={u.id}>
                <button
                  type="button"
                  className={`ems-row st-${st} ${selectedRescue === u.id ? "on" : ""}`}
                  onClick={() => {
                    setSelectedRescue(u.id);
                    consoleAudio.play("ui");
                  }}
                >
                  <span className="ems-cs mono">{u.callsign}</span>
                  <span
                    className={`ems-st mono st-${st}`}
                    title="Click status to cycle"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleStatus(u.id);
                    }}
                  >
                    {st}
                  </span>
                  <span className="ems-meta mono">{u.station}</span>
                  <span className="ems-caps">
                    {u.capability.map((c) => (
                      <i key={c}>{c}</i>
                    ))}
                  </span>
                  <span
                    className="ems-tone-btn"
                    role="button"
                    tabIndex={0}
                    title="Tone out rescue — DTMF + whistle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toneRescue(u);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toneRescue(u);
                      }
                    }}
                  >
                    TONE
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "hospital" && (
        <ul className="ems-list ems-hosp">
          {board.hospitals.map((h) => {
            const div = !!divert[h.id];
            return (
              <li key={h.id}>
                <button
                  type="button"
                  className={`ems-row hosp ${selectedHospital === h.id ? "on" : ""} ${div ? "divert" : ""}`}
                  onClick={() => medcomKey(h)}
                  title={`${h.freqMHz} MHz · ${h.tone}`}
                >
                  <span className="ems-cs">{h.name}</span>
                  <span className="ems-st mono">{h.level}</span>
                  <span className="ems-meta mono">
                    {h.freqMHz.toFixed(4)} · {h.tone}
                  </span>
                  <span
                    className={`ems-divert ${div ? "on" : ""}`}
                    role="button"
                    tabIndex={0}
                    title="Toggle divert (training)"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDivert(h.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleDivert(h.id);
                      }
                    }}
                  >
                    {div ? "DIVERT" : "OPEN"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "air" && (
        <ul className="ems-list">
          {board.airRescue.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="ems-row air"
                onClick={() => launchAir(a)}
              >
                <span className="ems-cs mono">{a.callsign}</span>
                <span className="ems-st mono">{a.status}</span>
                <span className="ems-meta mono">PAD {a.pad}</span>
                <span className="ems-tone-btn">LAUNCH</span>
              </button>
            </li>
          ))}
          <li className="ems-air-note mono">
            Last-known pads only · enable HELO on plate radar for blips
          </li>
        </ul>
      )}

      {log.length > 0 && (
        <div className="ems-log mono">
          {log.slice(0, 3).map((e, i) => (
            <div key={`${e.atMs}-${i}`}>
              +{(e.atMs / 1000).toFixed(0)}s [{e.kind}] {e.text}
            </div>
          ))}
        </div>
      )}

      <div className="ems-foot mono">
        {selectedCfsLabel
          ? `CFS LINK · ${selectedCfsLabel}`
          : "SELECT CFS TO LINK TONE-OUTS"}{" "}
        · MEDCOM RR FLAVOR
      </div>
    </div>
  );
}
