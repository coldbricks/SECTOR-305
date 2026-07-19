/**
 * Live evaluation strip — instrument feedback as the grader emits.
 * Doctrine before chrome: hard fails visible immediately, soft marks as coaching.
 */

import type { GradeEvent, MasteryFocus } from "@sector305/core";

type Props = {
  gradeLog: GradeEvent[];
  /** Max rows in the rolling feed */
  feedCap?: number;
  focus: MasteryFocus;
  scoreTitle: string;
};

export function LiveGradeStrip({ gradeLog, focus, scoreTitle, feedCap = 6 }: Props) {
  const hard = gradeLog.filter((g) => g.severity === "hard_fail");
  const soft = gradeLog.filter((g) => g.severity === "soft");
  const feed = gradeLog.slice(-feedCap).reverse();
  const lastHard = hard.length ? hard[hard.length - 1] : null;

  return (
    <div
      className={`live-grade-strip ${lastHard ? "has-hard" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Live evaluation"
    >
      <div className="lgs-counts mono">
        <span className={`lgs-pill hard ${hard.length ? "hot" : ""}`}>
          HARD {hard.length}
        </span>
        <span className={`lgs-pill soft ${soft.length ? "hot" : ""}`}>
          SOFT {soft.length}
        </span>
        <span className="lgs-pill dim">LOG {gradeLog.length}</span>
      </div>

      {lastHard ? (
        <div className="lgs-banner mono" title={lastHard.message}>
          <span className="lgs-banner-k">CRIT</span>
          <span className="lgs-banner-code">{lastHard.code}</span>
          <span className="lgs-banner-msg">{lastHard.message}</span>
          <span className="lgs-banner-t">+{(lastHard.atMs / 1000).toFixed(1)}s</span>
        </div>
      ) : (
        <div className="lgs-banner clean mono">
          <span className="lgs-banner-k">FOCUS</span>
          <span className="lgs-banner-code">{focus.label}</span>
          <span className="lgs-banner-msg">
            {focus.title} · no hard fails yet
          </span>
        </div>
      )}

      <div className="lgs-feed mono">
        <div className="lgs-score" title={`Scenario score by David Lombardo: ${scoreTitle}`}>
          <span className="lgs-score-k">SCORE</span>
          <strong>{scoreTitle}</strong>
          <span className="lgs-score-credit">D. LOMBARDO</span>
        </div>
        {feed.length === 0 ? (
          <span className="lgs-empty">Waiting for first grade event…</span>
        ) : (
          feed.map((g) => (
            <div
              key={g.id}
              className={`lgs-row sev-${g.severity === "hard_fail" ? "hard" : g.severity === "soft" ? "soft" : "note"}`}
            >
              <span className="lgs-t">+{(g.atMs / 1000).toFixed(1)}s</span>
              <span className="lgs-code">{g.code}</span>
              <span className="lgs-msg">{g.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
