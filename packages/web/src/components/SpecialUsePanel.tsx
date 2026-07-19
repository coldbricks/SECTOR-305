import { useEffect, useState } from "react";
import { consoleAudio } from "../audio/consoleAudio";

type Resource = {
  id: string;
  label: string;
  kind: string;
  detail: string;
  status: string;
};

type Module = {
  id: string;
  short: string;
  title: string;
  blurb: string;
  color: string;
  resources: Resource[];
};

type Board = {
  disclaimer: string;
  modules: Module[];
};

export type SpecialUseEvent = {
  atMs: number;
  moduleId: string;
  resourceId: string;
  action: string;
  text: string;
};

type Props = {
  clockMs: number;
  selectedCfsLabel?: string | null;
  onEvent?: (ev: SpecialUseEvent) => void;
};

const STATUS_CYCLE = ["STANDBY", "HOT", "WATCH", "AVL", "COLD", "OPEN"] as const;

/** SPECIAL USE desk — HIDTA, SWAT, marine, ARFF, events, open custom slots. */
export function SpecialUsePanel({ clockMs, selectedCfsLabel, onEvent }: Props) {
  const [board, setBoard] = useState<Board | null>(null);
  const [modId, setModId] = useState<string>("hidta");
  const [status, setStatus] = useState<Record<string, string>>({});
  const [active, setActive] = useState<Set<string>>(() => new Set());
  const [log, setLog] = useState<SpecialUseEvent[]>([]);
  const [slotNames, setSlotNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ac = new AbortController();
    fetch("/geo/miami/special-use-board.json", { signal: ac.signal })
      .then((r) => r.json())
      .then((j: Board) => {
        setBoard(j);
        const st: Record<string, string> = {};
        for (const m of j.modules) {
          for (const r of m.resources) st[r.id] = r.status;
        }
        setStatus(st);
        if (j.modules[0]) setModId(j.modules[0].id);
      })
      .catch(() => setBoard(null));
    return () => ac.abort();
  }, []);

  const mod = board?.modules.find((m) => m.id === modId) ?? board?.modules[0];

  function push(
    moduleId: string,
    resourceId: string,
    action: string,
    text: string
  ) {
    const ev: SpecialUseEvent = {
      atMs: clockMs,
      moduleId,
      resourceId,
      action,
      text,
    };
    setLog((prev) => [ev, ...prev].slice(0, 10));
    onEvent?.(ev);
  }

  function keyNet(r: Resource) {
    void consoleAudio.unlock();
    consoleAudio.play("radioKey");
    window.setTimeout(() => consoleAudio.play("radioCrackle"), 70);
    setActive((a) => new Set(a).add(r.id));
    setStatus((s) => ({
      ...s,
      [r.id]: s[r.id] === "COLD" || s[r.id] === "OPEN" ? "HOT" : s[r.id]!,
    }));
    const cfs = selectedCfsLabel ? ` · ${selectedCfsLabel}` : "";
    const label = slotNames[r.id] || r.label;
    push(modId, r.id, "key", `KEY ${label}${cfs} · ${r.detail}`);
  }

  function toggleActive(r: Resource) {
    setActive((a) => {
      const n = new Set(a);
      if (n.has(r.id)) n.delete(r.id);
      else n.add(r.id);
      return n;
    });
    consoleAudio.play("ui");
  }

  function cycleStatus(r: Resource) {
    setStatus((s) => {
      const cur = s[r.id] ?? "STANDBY";
      const i = STATUS_CYCLE.indexOf(cur as (typeof STATUS_CYCLE)[number]);
      const next =
        STATUS_CYCLE[i >= 0 ? (i + 1) % STATUS_CYCLE.length : 0] ?? "STANDBY";
      return { ...s, [r.id]: next };
    });
    consoleAudio.play("tick");
  }

  function renameSlot(r: Resource) {
    const cur = slotNames[r.id] || r.label;
    const name = window.prompt("Special-use label (train only)", cur);
    if (name == null || !name.trim()) return;
    setSlotNames((s) => ({ ...s, [r.id]: name.trim().slice(0, 24) }));
    push(modId, r.id, "rename", `RENAME → ${name.trim().slice(0, 24)}`);
    consoleAudio.play("ding");
  }

  if (!board || !mod) {
    return (
      <div className="spec-panel">
        <div className="spec-subhead mono">SPECIAL USE · …</div>
      </div>
    );
  }

  return (
    <div className="spec-panel" title={board.disclaimer}>
      <div className="spec-subhead mono">
        SPECIAL USE · WHO KNOWS WHAT · TRAIN ONLY
      </div>

      <div className="spec-mods">
        {board.modules.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`spec-mod color-${m.color} ${modId === m.id ? "on" : ""}`}
            onClick={() => {
              setModId(m.id);
              consoleAudio.play("ui");
            }}
            title={m.blurb}
          >
            {m.short}
          </button>
        ))}
      </div>

      <div className="spec-mod-head">
        <div className="spec-mod-title">{mod.title}</div>
        <div className="spec-mod-blurb">{mod.blurb}</div>
      </div>

      <ul className="spec-list">
        {mod.resources.map((r) => {
          const st = status[r.id] ?? r.status;
          const isHot = active.has(r.id) || st === "HOT";
          const label = slotNames[r.id] || r.label;
          return (
            <li key={r.id}>
              <div
                className={`spec-row kind-${r.kind} ${isHot ? "hot" : ""} st-${st.toLowerCase()}`}
              >
                <button
                  type="button"
                  className="spec-main"
                  onClick={() => keyNet(r)}
                  title="Key / open net"
                >
                  <span className="spec-label mono">{label}</span>
                  <span className="spec-kind mono">{r.kind}</span>
                  <span className="spec-detail">{r.detail}</span>
                </button>
                <button
                  type="button"
                  className={`spec-st mono st-${st.toLowerCase()}`}
                  title="Cycle status"
                  onClick={() => cycleStatus(r)}
                >
                  {st}
                </button>
                <button
                  type="button"
                  className={`spec-pin ${active.has(r.id) ? "on" : ""}`}
                  title="Pin as active special use"
                  onClick={() => toggleActive(r)}
                >
                  {active.has(r.id) ? "ON" : "OFF"}
                </button>
                {r.kind === "custom" && (
                  <button
                    type="button"
                    className="spec-rename"
                    title="Rename custom slot"
                    onClick={() => renameSlot(r)}
                  >
                    ✎
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {active.size > 0 && (
        <div className="spec-active mono">
          ACTIVE ·{" "}
          {[...active]
            .map((id) => {
              for (const m of board.modules) {
                const r = m.resources.find((x) => x.id === id);
                if (r) return slotNames[id] || r.label;
              }
              return id;
            })
            .join(" · ")}
        </div>
      )}

      {log.length > 0 && (
        <div className="spec-log mono">
          {log.slice(0, 3).map((e, i) => (
            <div key={`${e.atMs}-${e.resourceId}-${i}`}>
              +{(e.atMs / 1000).toFixed(0)}s {e.text}
            </div>
          ))}
        </div>
      )}

      <div className="spec-foot mono">
        {selectedCfsLabel
          ? `CFS LINK · ${selectedCfsLabel}`
          : "NO CFS LINK"}{" "}
        · KEY NET · PIN · CUSTOM RENAME
      </div>
    </div>
  );
}
