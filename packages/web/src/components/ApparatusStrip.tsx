import { useEffect, useState } from "react";
import { consoleAudio } from "../audio/consoleAudio";

type Station = {
  id: string;
  name: string;
  address: string;
  units: string[];
};

type Roster = {
  agency: string;
  disclaimer: string;
  stations: Station[];
};

export type FireToneEvent = {
  atMs: number;
  stationId: string;
  stationName: string;
  unit: string;
  caption: string;
};

type Props = {
  clockMs?: number;
  onToneOut?: (ev: FireToneEvent) => void;
};

/** City of Miami Fire-Rescue apparatus — tone-out dispatchable units. */
export function ApparatusStrip({ clockMs = 0, onToneOut }: Props) {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [openId, setOpenId] = useState<string | null>("FS-1");
  const [lastOut, setLastOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/geo/miami/city-miami-fire-apparatus.json", { signal: ac.signal })
      .then((r) => r.json())
      .then((j: Roster) => setRoster(j))
      .catch(() => setRoster(null));
    return () => ac.abort();
  }, []);

  if (!roster) {
    return (
      <div className="app-strip">
        <div className="as-head">APPARATUS · …</div>
      </div>
    );
  }

  const open = roster.stations.find((s) => s.id === openId) ?? roster.stations[0];

  function toneOut(unit: string) {
    if (!open || busy) return;
    setBusy(true);
    void consoleAudio.unlock();
    consoleAudio.fireStationAlert({ stationId: open.id });
    const caption = `${open.name} · ${unit} · tone-out · SE305 train`;
    setLastOut(`${unit} @ ${open.id}`);
    onToneOut?.({
      atMs: clockMs,
      stationId: open.id,
      stationName: open.name,
      unit,
      caption,
    });
    window.setTimeout(() => setBusy(false), 2200);
  }

  return (
    <div className="app-strip" title={roster.disclaimer}>
      <div className="as-head">
        <span>APPARATUS</span>
        <span className="mono dim">TONE-OUT</span>
      </div>
      <div className="as-stations">
        {roster.stations.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === open?.id ? "on" : ""}
            onClick={() => {
              setOpenId(s.id);
              consoleAudio.play("ui");
            }}
            title={s.address}
          >
            {s.id.replace("FS-", "")}
          </button>
        ))}
      </div>
      {open && (
        <div className="as-detail">
          <div className="as-name">{open.name}</div>
          <div className="as-addr mono">{open.address}</div>
          <div className="as-units">
            {open.units.map((u) => (
              <button
                key={u}
                type="button"
                className={`as-unit as-unit-btn ${lastOut === `${u} @ ${open.id}` ? "toned" : ""}`}
                disabled={busy}
                title={`Tone out ${u} — DTMF + SD-10 whistle`}
                onClick={() => toneOut(u)}
              >
                {u}
              </button>
            ))}
          </div>
          {lastOut && (
            <div className="as-last mono">
              LAST · {lastOut}
              {busy ? " · ALERTING…" : " · OK"}
            </div>
          )}
        </div>
      )}
      <div className="as-foot mono">CLICK UNIT · DTMF ×2 · SD-10 WHISTLE</div>
    </div>
  );
}
