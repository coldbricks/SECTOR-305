import { useEffect, useState } from "react";

export type RrChannel = {
  freqMHz: number | null;
  alpha: string;
  desc: string;
  tone: string;
  mode: string;
  tag: string;
  agency: string;
  callsign: string;
  role: "pri" | "tac" | "svc" | string;
};

type Pack = {
  id: string;
  disclaimer: string;
  portal: string;
  channels: RrChannel[];
};

/** RadioReference-flavored channel bank (ctid 328 curated). */
export function ChannelBank(props: {
  activeAlpha?: string;
  onSelect?: (ch: RrChannel) => void;
}) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [filter, setFilter] = useState<"all" | "pri" | "tac" | "fire" | "law">("pri");
  const [selected, setSelected] = useState<string | null>(props.activeAlpha ?? null);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/radio/ctid328_watch.json", { signal: ac.signal })
      .then((r) => r.json())
      .then((j: Pack) => setPack(j))
      .catch(() => setPack(null));
    return () => ac.abort();
  }, []);

  if (!pack) {
    return (
      <div className="channel-bank">
        <div className="cb-head">
          <span>CHAN BANK</span>
          <span className="mono dim">RR · …</span>
        </div>
      </div>
    );
  }

  const list = pack.channels.filter((c) => {
    if (filter === "all") return true;
    if (filter === "pri") return c.role === "pri" || c.tag.includes("Dispatch");
    if (filter === "tac") return c.role === "tac" || c.tag.includes("Tac");
    if (filter === "fire") return c.tag.toLowerCase().includes("fire");
    if (filter === "law") return c.tag.toLowerCase().includes("law") || c.tag === "Interop";
    return true;
  });

  return (
    <div className="channel-bank" title={pack.disclaimer}>
      <div className="cb-head">
        <span>CHAN BANK</span>
        <span className="mono dim">RR · CTID 328</span>
      </div>
      <div className="cb-filters">
        {(["pri", "tac", "fire", "law", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "on" : ""}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <ul className="cb-list">
        {list.map((ch, i) => {
          const id = `${ch.alpha}-${ch.freqMHz}-${i}`;
          const on = selected === ch.alpha;
          return (
            <li key={id}>
              <button
                type="button"
                className={`cb-row role-${ch.role} ${on ? "on" : ""}`}
                onClick={() => {
                  setSelected(ch.alpha);
                  props.onSelect?.(ch);
                }}
              >
                <span className="cb-alpha mono">{ch.alpha}</span>
                <span className="cb-freq mono">
                  {ch.freqMHz != null ? ch.freqMHz.toFixed(4) : "—"}
                </span>
                <span className="cb-tag">{ch.tag.replace("Fire ", "F ").replace("Law ", "L ")}</span>
                <span className="cb-desc">{ch.desc}</span>
                {ch.tone && <span className="cb-tone mono">{ch.tone}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="cb-foot mono">PUBLIC SCAN DB · TRAINING FICTION ONLY</div>
    </div>
  );
}
