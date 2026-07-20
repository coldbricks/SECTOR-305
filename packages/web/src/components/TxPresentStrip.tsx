/**
 * TX / present strip — training-only timeout feel under the air panel.
 * Polls radioSpeech.isBusy() + latest radio log pulse. Not operational PTT.
 */
import { useEffect, useRef, useState } from "react";
import type { RadioEvent } from "@sector305/core";
import { radioSpeech } from "../audio/radioSpeech";

type Props = {
  radioLog: RadioEvent[];
  /** Selected watch resource label */
  resourceLabel?: string;
};

type Pulse = {
  /** wall clock when present started */
  startMs: number;
  /** expected hold ms */
  holdMs: number;
  label: string;
  kind: string;
  from: string;
};

const MIN_HOLD = 1400;
const MAX_HOLD = 9000;
const IDLE_TAIL = 600;

function estimateHoldMs(caption: string, kind: string): number {
  // ~14 chars/sec speech + key-up tail; clamp for training chrome
  const base = 900 + caption.length * 55;
  if (kind === "EMERGENCY" || kind === "BOLO") return Math.min(MAX_HOLD, base * 1.15);
  if (kind === "STATUS" || kind === "ACK") return Math.min(MAX_HOLD, Math.max(MIN_HOLD, base * 0.85));
  return Math.min(MAX_HOLD, Math.max(MIN_HOLD, base));
}

export function TxPresentStrip(props: Props) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const lastIdRef = useRef<string | null>(null);
  const lastBusyRef = useRef(false);

  // Drive from radio log arrivals
  useEffect(() => {
    const last = props.radioLog[props.radioLog.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    setPulse({
      startMs: performance.now(),
      holdMs: estimateHoldMs(last.caption, last.kind),
      label: last.caption.slice(0, 72),
      kind: last.kind,
      from: last.from,
    });
  }, [props.radioLog]);

  // Also track live speech bus (baked audio may outlast log-only estimate)
  useEffect(() => {
    let raf = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const busy = radioSpeech.isBusy();
      const t = performance.now();
      setNow(t);

      if (busy && !lastBusyRef.current) {
        // Speech started without a fresh log edge (or overlapping)
        setPulse((prev) => {
          if (prev && t - prev.startMs < prev.holdMs) return prev;
          return {
            startMs: t,
            holdMs: 4500,
            label: radioSpeech.lastPlayedClipId() ?? "AIR TRAFFIC",
            kind: "TX",
            from: "CONSOLE",
          };
        });
      }
      lastBusyRef.current = busy;

      // Clear when hold elapsed and bus idle
      setPulse((prev) => {
        if (!prev) return null;
        if (busy) {
          // Extend while audio still airing
          const elapsed = t - prev.startMs;
          if (elapsed > prev.holdMs - 200) {
            return { ...prev, holdMs: elapsed + 800 };
          }
          return prev;
        }
        if (t - prev.startMs > prev.holdMs + IDLE_TAIL) return null;
        return prev;
      });

      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      alive = false;
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const active = !!pulse;
  const elapsed = pulse ? now - pulse.startMs : 0;
  const pct = pulse
    ? Math.max(0, Math.min(100, (1 - elapsed / pulse.holdMs) * 100))
    : 0;
  const hot = active && pct > 8;
  const emr =
    pulse?.kind === "EMERGENCY" ||
    pulse?.kind === "BOLO" ||
    /emergency|mayday/i.test(pulse?.label ?? "");

  return (
    <div
      className={`tx-present-strip ${hot ? "hot" : "idle"} ${emr ? "emr" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={hot ? "Transmit present" : "Transmit clear"}
    >
      <div className="tx-strip-bar" style={{ width: `${pct}%` }} />
      <div className="tx-strip-row mono">
        <span className={`tx-flag ${hot ? "on" : ""}`}>
          {hot ? "TX PRESENT" : "TX CLEAR"}
        </span>
        <span className="tx-res">
          {props.resourceLabel ?? "—"}
        </span>
        <span className="tx-from" title={pulse?.label}>
          {hot ? `${pulse!.from} · ${pulse!.kind}` : "STANDBY"}
        </span>
        <span className="tx-timeout">
          {hot ? `${Math.ceil((pulse!.holdMs - elapsed) / 100) / 10}s` : "—"}
        </span>
      </div>
      <div className="tx-strip-hint mono">
        TRAINING TIMEOUT · NOT OPERATIONAL PTT
      </div>
    </div>
  );
}
