/**
 * Continuous ops pressure readout — the desk equivalent of a continuous score.
 * Pure presentation of pack SLA + open CFS; no new grade law.
 */

import type { Incident } from "@sector305/core";
import {
  computeSla,
  formatMs,
  highAcuityPending,
  needsDispatchSla,
} from "../gameplay/opsDesk";

type Pri = { code: string; dispatchSlaMs: number };

type Props = {
  clockMs: number;
  incidents: Incident[];
  liveSim: boolean;
  onToggleLive: () => void;
  packPriorities: Pri[];
};

export function OpsPressureStrip({
  clockMs,
  incidents,
  liveSim,
  onToggleLive,
  packPriorities,
}: Props) {
  const pending = incidents.filter(needsDispatchSla);
  const highs = highAcuityPending(incidents);
  let hottest: { cfs: string; remain: number; band: string } | null = null;
  for (const inc of pending) {
    const s = computeSla(inc, clockMs, packPriorities);
    if (s.band === "na") continue;
    if (!hottest || s.remainMs < hottest.remain) {
      hottest = {
        cfs: inc.cfsNumber,
        remain: s.remainMs,
        band: s.band,
      };
    }
  }

  return (
    <div className="ops-pressure-strip mono" aria-label="Operations pressure">
      <button
        type="button"
        className={`ops-live-btn ${liveSim ? "on" : ""}`}
        onClick={onToggleLive}
        title="Toggle real-time sim clock (Space). Pause is first-class."
      >
        {liveSim ? "● LIVE" : "○ PAUSED"}
      </button>
      <span className="ops-pill">
        OPEN <strong>{pending.length}</strong>
      </span>
      <span className={`ops-pill ${highs >= 2 ? "hot" : highs === 1 ? "warm" : ""}`}>
        HIGH <strong>{highs}</strong>
      </span>
      <span className={`ops-sla band-${hottest?.band ?? "na"}`}>
        {hottest
          ? hottest.remain < 0
            ? `SLA · ${hottest.cfs} · BREACH`
            : `SLA · ${hottest.cfs} · ${formatMs(hottest.remain)}`
          : "SLA · CLEAR"}
      </span>
      <span className="ops-hint dim">
        SPACE LIVE · [ +5s · ] +30s · time is the game
      </span>
    </div>
  );
}
