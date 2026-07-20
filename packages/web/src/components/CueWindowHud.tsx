/**
 * Pedagogical knowable-window HUD.
 * Does NOT reveal truth content — only facet names + when the schedule opens.
 * Information-set fairness (C10).
 */

import { cueWindowsFromSchedule, type CueFacet } from "../gameplay/opsDesk";

type Props = {
  clockMs: number;
  /** From selected incident truth.knowableSchedule when present */
  schedule?: CueFacet[];
  /** Legacy ocean defaults if no schedule */
  weaponsAtMs?: number;
  locationAtMs?: number;
};

export function CueWindowHud({
  clockMs,
  schedule,
  weaponsAtMs = 15000,
  locationAtMs = 25000,
}: Props) {
  const rows =
    schedule && schedule.length
      ? cueWindowsFromSchedule(schedule, clockMs)
      : cueWindowsFromSchedule(
          [
            {
              atMs: weaponsAtMs,
              facet: "weapons",
              summary: "Weapons / nature cues (legacy default)",
            },
            {
              atMs: weaponsAtMs,
              facet: "nature",
              summary: "Nature reclass window",
            },
            {
              atMs: locationAtMs,
              facet: "location",
              summary: "Location facet",
            },
          ],
          clockMs
        );

  return (
    <div className="cue-window-hud" aria-label="Knowable cue windows">
      <div className="cwh-kicker mono">INFO-SET · CUE WINDOWS</div>
      <div className="cwh-rows">
        {rows.map((r) => (
          <div
            key={`${r.facet}-${r.atMs}`}
            className={`cwh-row ${r.open ? "open" : "closed"}`}
            title={r.summary}
          >
            <span className="cwh-dot" />
            <span className="cwh-label">{r.facet}</span>
            <span className="cwh-gate mono">
              {r.open ? "KNOWABLE" : `OPENS T+${(r.atMs / 1000).toFixed(0)}s`}
            </span>
          </div>
        ))}
      </div>
      <p className="cwh-hint">
        Hard fails only after a cue is knowable. LIVE sim or [ ] advance the
        clock — training, not cheating.
      </p>
    </div>
  );
}
