import { useEffect, useRef, useState } from "react";
import {
  SHELL_TRACK_META,
  shellMusic,
  type ShellMusicSnapshot,
} from "../audio/shellMusic";
import { consoleAudio } from "../audio/consoleAudio";

const OCCUPY = [
  "Full track. Not a jingle. Let the guitar finish the phrase.",
  "David Lombardo on guitar — this is the title sequence.",
  "When you’re ready, OPEN WATCH fades the song into the glass.",
  "Ocean corridor checkride waits. The song doesn’t rush you.",
  "Imperfect map. Perfect riff. Sit with both.",
  "PD · FD · EMS · SPEC — the desk is ready after the outro.",
  "Loop if you want an encore. Or let it end clean.",
  "South Beach shell · full song · your hands on the frets.",
];

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

type Props = {
  ready: boolean;
  muted: boolean;
  musicMuted: boolean;
  onPlayRequest: () => void;
};

/** Full-song listening lounge for the prestige shell. */
export function ShellListeningDeck({
  ready,
  muted,
  musicMuted,
  onPlayRequest,
}: Props) {
  const [snap, setSnap] = useState<ShellMusicSnapshot>(() => shellMusic.snapshot());
  const [tipIdx, setTipIdx] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const binsRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    return shellMusic.subscribe(() => setSnap(shellMusic.snapshot()));
  }, []);

  // Rotate “something to occupy the listening”
  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIdx((i) => (i + 1) % OCCUPY.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  // Visualizer
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // bed
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "rgba(255,45,123,0.15)");
      g.addColorStop(0.5, "rgba(56,190,235,0.12)");
      g.addColorStop(1, "rgba(255,45,123,0.15)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const analyser = shellMusic.getAnalyser();
      if (analyser && snap.playing && !snap.muted) {
        const n = analyser.frequencyBinCount;
        if (!binsRef.current || binsRef.current.length !== n) {
          binsRef.current = new Uint8Array(n);
        }
        shellMusic.getSpectrum(binsRef.current);
        const bins = binsRef.current;
        const bars = 48;
        const step = Math.floor(n / bars);
        const bw = w / bars;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += bins[i * step + j] ?? 0;
          const v = sum / step / 255;
          const bh = Math.max(2, v * h * 0.92);
          const x = i * bw;
          const y = (h - bh) / 2;
          const pink = i / bars;
          ctx.fillStyle = `rgba(${Math.round(255 * pink + 56 * (1 - pink))}, ${Math.round(45 + 145 * (1 - pink))}, ${Math.round(123 + 112 * (1 - pink))}, ${0.35 + v * 0.55})`;
          ctx.fillRect(x + 1, y, Math.max(1, bw - 2), bh);
        }
      } else {
        // idle pulse so the deck never looks dead
        const t = performance.now() / 1000;
        for (let i = 0; i < 48; i++) {
          const v = 0.12 + 0.08 * Math.sin(t * 1.4 + i * 0.35);
          const bw = w / 48;
          const bh = v * h;
          ctx.fillStyle = `rgba(56,190,235,${0.15 + v})`;
          ctx.fillRect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 2), bh);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [snap.playing, snap.muted]);

  const progress =
    snap.duration > 0 ? Math.min(1, snap.current / snap.duration) : 0;

  if (!ready) {
    return (
      <div className="listen-deck empty">
        <div className="listen-kicker mono">LISTENING DECK · STANDBY</div>
        <p className="listen-empty-copy">
          Full song slot is live. When the track is exported, drop it at{" "}
          <code>public/audio/shell-theme.mp3</code> — guitar credit already set for{" "}
          <strong>David Lombardo</strong>.
        </p>
        <ul className="listen-occupy">
          {OCCUPY.slice(0, 3).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`listen-deck ${snap.playing ? "is-playing" : ""}`}>
      <div className="listen-kicker mono">
        <span className="listen-live">{snap.playing ? "● NOW PLAYING" : "○ READY"}</span>
        <span>FULL SONG · NOT A STING</span>
      </div>

      <div className="listen-title-block">
        <div className="listen-title">{SHELL_TRACK_META.title}</div>
        <div className="listen-artist">{SHELL_TRACK_META.artist}</div>
        <div className="listen-credit mono">{SHELL_TRACK_META.credit}</div>
      </div>

      <canvas
        ref={canvasRef}
        className="listen-viz"
        width={640}
        height={88}
        aria-hidden
      />

      <div className="listen-timeline">
        <span className="mono listen-t">{fmt(snap.current)}</span>
        <input
          type="range"
          className="listen-scrub"
          min={0}
          max={snap.duration || 1}
          step={0.1}
          value={scrub ?? snap.current}
          onPointerDown={() => setScrub(snap.current)}
          onPointerUp={() => {
            if (scrub != null) shellMusic.seek(scrub);
            setScrub(null);
          }}
          onChange={(e) => {
            const v = Number(e.target.value);
            setScrub(v);
            shellMusic.seek(v);
          }}
          aria-label="Seek"
        />
        <span className="mono listen-t">{fmt(snap.duration)}</span>
      </div>
      <div className="listen-progress-track" aria-hidden>
        <i style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="listen-controls">
        <button
          type="button"
          className="listen-btn primary"
          disabled={muted || musicMuted}
          onClick={() => {
            void consoleAudio.unlock();
            onPlayRequest();
            shellMusic.togglePlay();
          }}
        >
          {snap.playing ? "PAUSE" : snap.ended ? "PLAY AGAIN" : "PLAY"}
        </button>
        <button
          type="button"
          className="listen-btn"
          onClick={() => {
            void consoleAudio.unlock();
            onPlayRequest();
            shellMusic.restart();
          }}
        >
          RESTART
        </button>
        <button
          type="button"
          className={`listen-btn ${snap.loop ? "on" : ""}`}
          onClick={() => shellMusic.setLoop(!snap.loop)}
          title="Loop full song"
        >
          LOOP {snap.loop ? "ON" : "OFF"}
        </button>
        <label className="listen-vol">
          <span className="mono">VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={snap.volume}
            onChange={(e) => shellMusic.setVolume(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="listen-occupy-card" key={tipIdx}>
        <div className="listen-occupy-k mono">WHILE YOU LISTEN</div>
        <p>{OCCUPY[tipIdx]}</p>
      </div>

      <div className="listen-story mono">
        <div>① Let the guitar land</div>
        <div>② Read the checkride strip above</div>
        <div>③ OPEN WATCH when the song (or you) is ready — theme fades out</div>
      </div>
    </div>
  );
}
