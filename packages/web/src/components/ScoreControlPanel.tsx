import { useEffect, useState } from "react";
import { SCENARIO_SCORE_TRACKS } from "../audio/scenarioScore";
import { shellMusic, type ShellMusicSnapshot } from "../audio/shellMusic";

type Props = {
  open: boolean;
  musicMuted: boolean;
  onClose: () => void;
  onToggleMusic: () => void;
};

export function ScoreControlPanel({
  open,
  musicMuted,
  onClose,
  onToggleMusic,
}: Props) {
  const [snapshot, setSnapshot] = useState<ShellMusicSnapshot>(() =>
    shellMusic.snapshot()
  );

  useEffect(
    () => shellMusic.subscribe(() => setSnapshot(shellMusic.snapshot())),
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const level = Math.min(0.18, Math.max(0.02, snapshot.volume));

  return (
    <aside className="score-console" aria-label="Scenario score controls">
      <header className="score-console-head mono">
        <div>
          <span className="score-console-kicker">S305 · SCORE DESK</span>
          <strong>{snapshot.trackTitle}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close score controls">
          ×
        </button>
      </header>

      <div className="score-console-status mono">
        <span className={musicMuted ? "off" : "on"}>
          {musicMuted ? "● BED OFF" : "● BED LIVE"}
        </span>
        <span>DUCK · AUTO</span>
        <span>17 UNIQUE MASTERS</span>
      </div>

      <div className="score-console-actions">
        <button type="button" onClick={() => shellMusic.stepScenarioTrack(-1)}>
          PREV
        </button>
        <button type="button" className="primary" onClick={onToggleMusic}>
          {musicMuted ? "BED ON" : "BED OFF"}
        </button>
        <button type="button" onClick={() => shellMusic.stepScenarioTrack(1)}>
          NEXT
        </button>
      </div>

      <label className="score-console-level mono">
        <span>BED LEVEL</span>
        <input
          type="range"
          aria-label="Scenario score level"
          min="0.02"
          max="0.18"
          step="0.01"
          value={level}
          onChange={(event) => shellMusic.setVolume(Number(event.target.value))}
        />
        <span>{Math.round(level * 100)}%</span>
      </label>

      <ol className="score-console-list" aria-label="Scenario score catalog">
        {SCENARIO_SCORE_TRACKS.map((track, index) => {
          const active = track.id === snapshot.trackId;
          return (
            <li key={track.id}>
              <button
                type="button"
                className={active ? "active" : ""}
                aria-current={active ? "true" : undefined}
                onClick={() => shellMusic.selectScenarioTrack(track.id)}
              >
                <span className="score-track-index mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{track.title}</span>
                <span className="score-track-time mono">
                  {Math.floor(track.durationSeconds / 60)}:
                  {String(Math.round(track.durationSeconds % 60)).padStart(2, "0")}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <footer className="score-console-foot mono">
        MUSIC · DAVID LOMBARDO · RADIO PRIORITY PROTECTED
      </footer>
    </aside>
  );
}
