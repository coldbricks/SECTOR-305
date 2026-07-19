/**
 * Pedagogical knowable-window HUD for ocean checkride.
 * Does NOT reveal truth content — only that the scenario timeline has opened
 * the window when the trainee may act on cues (info-set fairness law).
 *
 * Matches checkride_a07_ocean_robbery_v1 schedule: weapons/nature @15s, loc @25s.
 */

type Props = {
  clockMs: number;
  weaponsAtMs?: number;
  locationAtMs?: number;
};

export function CueWindowHud({
  clockMs,
  weaponsAtMs = 15000,
  locationAtMs = 25000,
}: Props) {
  const weaponsOpen = clockMs >= weaponsAtMs;
  const locOpen = clockMs >= locationAtMs;

  return (
    <div className="cue-window-hud" aria-label="Knowable cue windows">
      <div className="cwh-kicker mono">INFO-SET · CUE WINDOWS</div>
      <div className="cwh-rows">
        <div className={`cwh-row ${weaponsOpen ? "open" : "closed"}`}>
          <span className="cwh-dot" />
          <span className="cwh-label">Weapons / nature</span>
          <span className="cwh-gate mono">
            {weaponsOpen ? "KNOWABLE" : `OPENS T+${(weaponsAtMs / 1000).toFixed(0)}s`}
          </span>
        </div>
        <div className={`cwh-row ${locOpen ? "open" : "closed"}`}>
          <span className="cwh-dot" />
          <span className="cwh-label">Location facet</span>
          <span className="cwh-gate mono">
            {locOpen ? "KNOWABLE" : `OPENS T+${(locationAtMs / 1000).toFixed(0)}s`}
          </span>
        </div>
      </div>
      <p className="cwh-hint">
        Hard fails only after a cue is knowable. Advancing sim is training, not
        cheating.
      </p>
    </div>
  );
}
