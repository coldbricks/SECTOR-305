import { useEffect, useMemo, useState } from "react";

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

export type ResourceDiscipline = "pd" | "fire" | "ems" | "svc";

type Pack = {
  id: string;
  disclaimer: string;
  portal: string;
  channels: RrChannel[];
};

type FolderId = "pd" | "fire" | "ems" | "all";

const FOLDERS: { id: FolderId; label: string; short: string }[] = [
  { id: "pd", label: "POLICE", short: "PD" },
  { id: "fire", label: "FIRE", short: "FIRE" },
  { id: "ems", label: "EMS", short: "EMS" },
  { id: "all", label: "ALL", short: "ALL" },
];

/** Map channel metadata → discipline for modern resource-tile chrome. */
export function channelDiscipline(ch: RrChannel): ResourceDiscipline {
  const blob = `${ch.tag} ${ch.agency} ${ch.alpha} ${ch.desc}`.toLowerCase();
  if (/\bems\b|rescue|med|hospital/.test(blob)) return "ems";
  if (/\bfire\b|fg\b|fireground/.test(blob)) return "fire";
  if (/\blaw\b|police|tac|ocean|central|pri|admin/.test(blob)) return "pd";
  return "svc";
}

function folderMatch(ch: RrChannel, folder: FolderId): boolean {
  if (folder === "all") return true;
  return channelDiscipline(ch) === folder;
}

function tgBadge(tone: string): string {
  const m = tone.match(/(\d{3,})/);
  if (m) return m[1]!;
  return tone.replace(/^TG\s*/i, "").slice(0, 8) || "—";
}

/** Fictional SECTOR 305 resource bank — AXS-era tile grid (original chrome). */
export function ChannelBank(props: {
  activeAlpha?: string;
  onSelect?: (ch: RrChannel) => void;
}) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [folder, setFolder] = useState<FolderId>("pd");
  const [selected, setSelected] = useState<string | null>(
    props.activeAlpha ?? null
  );
  const [muted, setMuted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const ac = new AbortController();
    fetch("/radio/sector305_channels.json", { signal: ac.signal })
      .then((r) => r.json())
      .then((j: Pack) => setPack(j))
      .catch(() => setPack(null));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (props.activeAlpha) setSelected(props.activeAlpha);
  }, [props.activeAlpha]);

  const list = useMemo(() => {
    if (!pack) return [] as RrChannel[];
    return pack.channels.filter((c) => folderMatch(c, folder));
  }, [pack, folder]);

  if (!pack) {
    return (
      <div
        className="channel-bank channel-bank--tiles"
        role="region"
        aria-label="Fictional resource bank"
      >
        <div className="cb-head">
          <span>RESOURCE BANK</span>
          <span className="mono dim">SIM · …</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="channel-bank channel-bank--tiles"
      role="region"
      aria-label="Fictional resource bank"
      title={pack.disclaimer}
    >
      <div className="cb-head">
        <span>RESOURCE BANK</span>
        <span className="mono dim">SIM · A07</span>
      </div>

      <div className="cb-softrow mono" aria-label="Radio soft controls">
        <span className="cb-soft-key">TX</span>
        <span className="cb-soft-key">TONE</span>
        <span className="cb-soft-key">FREQ</span>
        <span className="cb-soft-meta">
          {selected ? selected : "NO RESOURCE"}
        </span>
      </div>

      <div className="cb-folders" role="tablist" aria-label="Resource folders">
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={folder === f.id}
            className={`cb-folder cb-folder--${f.id} ${folder === f.id ? "on" : ""}`}
            onClick={() => setFolder(f.id)}
          >
            {f.short}
          </button>
        ))}
      </div>

      <div className="cb-tile-grid">
        {list.map((ch, i) => {
          const disc = channelDiscipline(ch);
          const id = `${ch.alpha}-${ch.tone || ch.freqMHz}-${i}`;
          const on = selected === ch.alpha;
          const isMuted = !!muted[ch.alpha];
          return (
            <div
              key={id}
              className={`cb-tile disc-${disc} role-${ch.role} ${on ? "on" : ""} ${isMuted ? "is-muted" : ""}`}
            >
              <span className="cb-tile-rail" aria-hidden />
              <button
                type="button"
                className="cb-tile-main"
                onClick={() => {
                  setSelected(ch.alpha);
                  props.onSelect?.(ch);
                }}
                title={`${ch.desc} · ${ch.tone || "CSQ"} · ${ch.mode}`}
              >
                <span className="cb-tile-top">
                  <span className="cb-tile-bolt" aria-hidden>
                    ⚡
                  </span>
                  <span className="cb-tile-alpha mono">{ch.alpha}</span>
                  <span className="cb-tile-badge mono">{tgBadge(ch.tone)}</span>
                </span>
                <span className="cb-tile-sub">{ch.desc}</span>
                <span className="cb-tile-meta mono">
                  <span className="cb-tile-tag">
                    {ch.tag.replace("Fire ", "F ").replace("Law ", "L ")}
                  </span>
                  <span className="cb-tile-role">
                    {String(ch.role).toUpperCase()}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className={`cb-mute ${isMuted ? "on" : ""}`}
                aria-label={isMuted ? "Unmute resource" : "Mute resource"}
                title="Training mute (local chrome only)"
                onClick={() => {
                  setMuted((prev) => ({
                    ...prev,
                    [ch.alpha]: !prev[ch.alpha],
                  }));
                }}
              >
                {isMuted ? "M" : "V"}
              </button>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="cb-empty mono">No resources in folder</div>
        )}
      </div>

      <div className="cb-foot mono">FICTIONAL PLAN · TRAINING ONLY</div>
    </div>
  );
}
