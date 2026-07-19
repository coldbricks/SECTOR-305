import { useEffect, useRef } from "react";
import { shellMusic } from "../audio/shellMusic";
import { splashFxBed } from "../audio/splashFxBed";
import { consoleAudio } from "../audio/consoleAudio";
import type { MasteryProfile, ScenarioCatalogEntry } from "@sector305/core";

type Props = {
  booting: boolean;
  musicReady: boolean;
  muted: boolean;
  musicMuted: boolean;
  mastery: MasteryProfile;
  scenarioId: string;
  scenarios: ScenarioCatalogEntry[];
  onSelectScenario: (id: string) => void;
  onBegin: () => void;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
  onResetMastery: () => void;
};

/** Blinking hotspots over the wall map (screen-space %). */
const MAP_BLIPS = [
  { left: "28%", top: "22%", delay: "0s", color: "cyan" },
  { left: "42%", top: "30%", delay: "0.4s", color: "amber" },
  { left: "55%", top: "26%", delay: "0.9s", color: "cyan" },
  { left: "63%", top: "34%", delay: "1.3s", color: "red" },
  { left: "48%", top: "38%", delay: "0.2s", color: "cyan" },
  { left: "36%", top: "42%", delay: "1.7s", color: "amber" },
  { left: "58%", top: "20%", delay: "0.7s", color: "cyan" },
  { left: "70%", top: "28%", delay: "1.1s", color: "pink" },
  { left: "40%", top: "18%", delay: "1.5s", color: "cyan" },
  { left: "52%", top: "44%", delay: "0.5s", color: "amber" },
];

/**
 * Control-room splash — dimmed photo, theme starts on first gesture / mount,
 * tiny credit, small BEGIN (long fade out).
 */
export function ShellSplash({
  booting,
  musicReady,
  muted,
  musicMuted,
  mastery,
  scenarioId,
  scenarios,
  onSelectScenario,
  onBegin,
  onResetMastery,
}: Props) {
  const selected =
    scenarios.find((s) => s.id === scenarioId) ?? scenarios[0] ?? null;
  const ordered = [...scenarios].sort((a, b) => a.menuOrder - b.menuOrder);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!musicReady || muted || musicMuted || booting) return;
    let cancelled = false;

    const kick = async () => {
      if (cancelled) return;
      shellMusic.forceUnmute();
      await consoleAudio.unlock();
      if (!startedRef.current) {
        const ok = await shellMusic.play();
        if (ok) startedRef.current = true;
      }
      // Room SFX under the song — always try, even if theme was blocked once
      splashFxBed.setMasterMuted(false);
      void splashFxBed.start();
    };

    void kick();

    // Capture any first interaction (including BEGIN)
    const onGesture = () => {
      void kick();
    };
    window.addEventListener("pointerdown", onGesture, { capture: true });
    window.addEventListener("keydown", onGesture, { capture: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
      splashFxBed.stop();
    };
  }, [musicReady, muted, musicMuted, booting]);

  // Mute / boot: hush the bed
  useEffect(() => {
    splashFxBed.setMasterMuted(muted || musicMuted || booting);
    if (booting) splashFxBed.stop();
  }, [muted, musicMuted, booting]);

  async function handleBegin() {
    shellMusic.forceUnmute();
    await consoleAudio.unlock();
    splashFxBed.stop();
    if (musicReady) {
      if (!shellMusic.snapshot().playing) await shellMusic.play();
    }
    onBegin();
  }

  return (
    <div className={`shell-splash photo ${booting ? "is-booting" : ""}`}>
      <div
        className="shell-splash-photo"
        style={{ backgroundImage: "url(/splash/control-room.jpg)" }}
        role="img"
        aria-label="SECTOR 305 control room"
      />
      <div className="shell-splash-photo-veil" aria-hidden />
      <div className="shell-splash-scan" aria-hidden />

      <div className="shell-map-blips" aria-hidden>
        {MAP_BLIPS.map((b, i) => (
          <span
            key={i}
            className={`map-blip blip-${b.color}`}
            style={{ left: b.left, top: b.top, animationDelay: b.delay }}
          />
        ))}
        <div className="map-scanline" />
      </div>

      <div className="shell-splash-letterbox top" aria-hidden />
      <div className="shell-splash-letterbox bottom" aria-hidden />

      <div className="shell-splash-center minimal">
        <div className="splash-eyebrow mono">PUBLIC SAFETY TRAINING SIMULATION</div>
        <h1 className="splash-wordmark">
          <span className="sw-sector">SECTOR</span>
          <span className="sw-num">305</span>
        </h1>
        <p className="splash-tagline">Complexity that grades you.</p>
        <div className="splash-sub mono">
          MIAMI FICTION · CONSOLE A07 · IMPERFECT LAST-KNOWN
        </div>
        <div className="splash-track-credit">Lead guitar — David Lombardo</div>

        <section
          className={`splash-watch-objective mode-${mastery.focus.mode}`}
          aria-label="Next watch objective"
        >
          <div className="swo-head mono">
            <span>WATCH DIRECTIVE</span>
            <span>{mastery.focus.label}</span>
          </div>
          <strong>{mastery.focus.title}</strong>
          <p>{mastery.focus.brief}</p>
          <div className="swo-ledger mono">
            {mastery.watchesCompleted === 0
              ? "FIRST WATCH · ADAPTIVE PROFILE ARMED"
              : `${mastery.watchesCompleted} WATCH${mastery.watchesCompleted === 1 ? "" : "ES"} OBSERVED · ${mastery.cleanWatches} CLEAN`}
          </div>
          {mastery.watchesCompleted > 0 ? (
            <button
              type="button"
              className="swo-reset"
              aria-label="Reset adaptive profile"
              onClick={onResetMastery}
            >
              RESET PROFILE
            </button>
          ) : null}
        </section>

        <section className="splash-scenario-desk" aria-label="Scenario select">
          <div className="swo-head mono">
            <span>SCENARIO CLASS · A07</span>
            <span>{ordered.length} LOADED</span>
          </div>
          <label className="splash-scenario-label mono" htmlFor="scenario-select">
            SELECT WATCH
          </label>
          <select
            id="scenario-select"
            className="splash-scenario-select"
            value={scenarioId}
            disabled={booting}
            onChange={(e) => onSelectScenario(e.target.value)}
          >
            {ordered.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.kind.toUpperCase()}] {s.title}
              </option>
            ))}
          </select>
          {selected ? (
            <p className="splash-scenario-brief">{selected.brief}</p>
          ) : null}
        </section>

        <button
          type="button"
          className="splash-begin"
          disabled={booting}
          onClick={() => void handleBegin()}
        >
          {booting ? "…" : "BEGIN"}
        </button>

        <div className="splash-foot mono">
          NOT A REAL AGENCY SYSTEM · TRAINING USE ONLY · v0.2
        </div>
      </div>

      {booting && (
        <div className="splash-boot mono" aria-live="polite">
          <div>AUTH · TRAINEE SESSION</div>
          <div className="accent">LINKING SECTOR…</div>
          <div>CHANNEL · SE305-PRI</div>
        </div>
      )}
    </div>
  );
}
