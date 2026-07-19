import { useEffect, useState } from "react";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pad3(n: number): string {
  if (n < 10) return `00${n}`;
  if (n < 100) return `0${n}`;
  return String(n);
}

export type ZuluParts = {
  h: string;
  m: string;
  s: string;
  ms: string;
  date: string;
  iso: string;
};

export function readZulu(d = new Date()): ZuluParts {
  const h = pad2(d.getUTCHours());
  const m = pad2(d.getUTCMinutes());
  const s = pad2(d.getUTCSeconds());
  const ms = pad3(d.getUTCMilliseconds());
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  return {
    h,
    m,
    s,
    ms,
    date: `${y}-${mo}-${day}`,
    iso: d.toISOString(),
  };
}

/** Live wall-clock in Zulu/UTC — big plate-style readout. */
export function ZuluClock(props: {
  simMs?: number;
  compact?: boolean;
  className?: string;
}) {
  const [z, setZ] = useState(() => readZulu());

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      // ~10 Hz is enough for tenths without thrashing React
      if (t - last > 90) {
        last = t;
        setZ(readZulu());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const sim =
    props.simMs != null ? `T+${(props.simMs / 1000).toFixed(1)}s` : null;

  if (props.compact) {
    return (
      <div className={`zulu-clock compact ${props.className ?? ""}`} title={z.iso}>
        <span className="zulu-time mono">
          {z.h}:{z.m}:{z.s}
          <span className="zulu-z">Z</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`zulu-clock ${props.className ?? ""}`}
      title={`Coordinated Universal Time · ${z.iso}`}
      aria-label={`Zulu time ${z.h} ${z.m} ${z.s}`}
    >
      <div className="zulu-kicker">
        <span className="zulu-dot" />
        UTC · ZULU
      </div>
      <div className="zulu-time mono">
        <span className="zulu-hms">
          {z.h}
          <span className="zulu-colon">:</span>
          {z.m}
          <span className="zulu-colon">:</span>
          {z.s}
        </span>
        <span className="zulu-frac">.{z.ms.slice(0, 1)}</span>
        <span className="zulu-z">Z</span>
      </div>
      <div className="zulu-sub mono">
        <span>{z.date}</span>
        {sim && <span className="zulu-sim">{sim} SIM</span>}
      </div>
    </div>
  );
}
