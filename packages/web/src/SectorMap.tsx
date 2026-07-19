import type { Incident, Unit } from "@sector305/core";

/** Sector plate geometry — fiction SE305-A07 (viewBox 0..100 × 0..100). */
const ZONES: {
  id: string;
  name: string;
  short: string;
  poly: string;
  label: { x: number; y: number };
  handoff?: boolean;
}[] = [
  {
    id: "Z-OCEAN",
    name: "Ocean Drive corridor",
    short: "OCEAN",
    poly: "72,8 92,10 94,42 78,48 68,38 70,12",
    label: { x: 80, y: 26 },
  },
  {
    id: "Z-COLLINS",
    name: "Collins Ave mid-beach",
    short: "COLLINS",
    poly: "58,22 70,18 68,42 76,52 62,58 52,48 54,28",
    label: { x: 62, y: 38 },
  },
  {
    id: "Z-WYNWOOD",
    name: "Wynwood / Midtown",
    short: "WYNWOOD",
    poly: "22,12 48,10 52,28 44,40 24,38 18,24",
    label: { x: 34, y: 24 },
  },
  {
    id: "Z-DOWNTOWN",
    name: "Downtown core",
    short: "DTN",
    poly: "28,40 52,38 58,52 54,68 30,72 22,56",
    label: { x: 40, y: 54 },
  },
  {
    id: "Z-PORT",
    name: "Port edge · handoff",
    short: "PORT",
    poly: "12,62 28,58 34,78 22,92 8,86 6,70",
    label: { x: 18, y: 74 },
    handoff: true,
  },
];

/** Unit last-known scatter within zone (deterministic from callsign). */
function unitPos(zoneId: string, callsign: string, index: number): { x: number; y: number } {
  const z = ZONES.find((zz) => zz.id === zoneId) ?? ZONES[0]!;
  const h = [...callsign].reduce((a, c) => a + c.charCodeAt(0), 0);
  const ox = ((h * 17 + index * 13) % 11) - 5;
  const oy = ((h * 7 + index * 19) % 9) - 4;
  return { x: z.label.x + ox * 0.55, y: z.label.y + oy * 0.55 };
}

function confClass(c?: string): string {
  if (!c || c === "none") return "conf-none";
  return `conf-${c}`;
}

function highestPri(cfs: Incident[]): string {
  const rank = (p: string) =>
    ({ P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 } as Record<string, number>)[p] ?? 9;
  return cfs.slice().sort((a, b) => rank(a.priority) - rank(b.priority))[0]?.priority ?? "";
}

export function SectorMap(props: {
  incidents: Incident[];
  units: Unit[];
  selectedId: string | null;
  clockMs: number;
  sectorId: string;
  onSelectCfs?: (id: string) => void;
}) {
  const { incidents, units, selectedId, clockMs, sectorId, onSelectCfs } = props;
  const open = incidents.filter(
    (i) => i.status !== "CLEARED" && i.status !== "CANCELLED"
  );
  const activeUnits = units.filter((u) => u.status !== "OOS");

  return (
    <div className="tactical-plate">
      <div className="tactical-chrome">
        <div className="tac-left">
          <span className="tac-live">● LIVE</span>
          <span className="tac-title">SECTOR PLATE</span>
          <span className="tac-id">{sectorId}</span>
        </div>
        <div className="tac-mid">
          <span className="tac-mode">IMPERFECT · LAST-KNOWN</span>
          <span className="tac-mode dim">NO TRUTH PINS</span>
        </div>
        <div className="tac-right">
          <span className="tac-clock mono">
            T+{(clockMs / 1000).toFixed(1)}s
          </span>
          <span className="tac-counts mono">
            CFS {open.length} · U {activeUnits.length}
          </span>
        </div>
      </div>

      <div className="tactical-stage">
        <svg
          className="tactical-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="SE305-A07 imperfect sector map"
        >
          <defs>
            <radialGradient id="bayGlow" cx="55%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0a1620" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#020408" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="oceanFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0c2840" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0a3a55" stopOpacity="0.55" />
            </linearGradient>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="tacGrid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path
                d="M 5 0 L 0 0 0 5"
                fill="none"
                stroke="rgba(56,190,235,0.06)"
                strokeWidth="0.15"
              />
            </pattern>
            <pattern id="tacScan" width="100" height="8" patternUnits="userSpaceOnUse">
              <rect width="100" height="0.35" fill="rgba(56,190,235,0.03)" />
            </pattern>
          </defs>

          {/* Void + bay */}
          <rect width="100" height="100" fill="url(#bayGlow)" />
          <rect width="100" height="100" fill="url(#tacGrid)" />

          {/* Atlantic mass (east) */}
          <path
            d="M 78 0 L 100 0 L 100 100 L 88 100 L 82 70 L 86 40 L 80 0 Z"
            fill="url(#oceanFill)"
          />
          {/* Biscayne / bay suggestion */}
          <path
            d="M 0 45 Q 18 50 22 70 L 8 100 L 0 100 Z"
            fill="rgba(8,40,55,0.45)"
          />
          {/* Causeway whisper */}
          <path
            d="M 30 62 L 72 48"
            stroke="rgba(56,190,235,0.12)"
            strokeWidth="0.35"
            strokeDasharray="1.2 0.8"
            fill="none"
          />
          <path
            d="M 34 70 L 70 58"
            stroke="rgba(56,190,235,0.08)"
            strokeWidth="0.25"
            strokeDasharray="0.8 1"
            fill="none"
          />

          {/* Zones */}
          {ZONES.map((z) => {
            const cfsHere = open.filter((i) => i.location.zoneId === z.id);
            const conf =
              cfsHere.length === 0
                ? "none"
                : cfsHere.some((c) => c.locationConfidence === "conflicting")
                  ? "conflicting"
                  : cfsHere.some((c) => c.locationConfidence === "unverified")
                    ? "unverified"
                    : cfsHere.some((c) => c.locationConfidence === "partial")
                      ? "partial"
                      : "verified";
            const hot = cfsHere.some((c) => c.priority === "P0" || c.priority === "P1");
            return (
              <g key={z.id} className={`zone-layer ${confClass(conf)} ${hot ? "zone-hot" : ""}`}>
                <polygon
                  points={z.poly}
                  className="zone-poly"
                  filter={hot ? "url(#softGlow)" : undefined}
                />
                <polygon points={z.poly} className="zone-poly-edge" />
                <text x={z.label.x} y={z.label.y - 3} className="zone-label">
                  {z.short}
                  {z.handoff ? " ▸" : ""}
                </text>
                {cfsHere.length > 0 && (
                  <text x={z.label.x} y={z.label.y + 2.2} className="zone-sub mono">
                    {highestPri(cfsHere)} · {cfsHere.length}
                  </text>
                )}
              </g>
            );
          })}

          {/* CFS markers (stated location — imperfect) */}
          {open.map((inc) => {
            const z = ZONES.find((zz) => zz.id === inc.location.zoneId);
            if (!z) return null;
            const idx = open.filter((i) => i.location.zoneId === inc.location.zoneId).indexOf(inc);
            const x = z.label.x + (idx % 3) * 2.2 - 2;
            const y = z.label.y + 5 + Math.floor(idx / 3) * 3;
            const sel = inc.id === selectedId;
            return (
              <g
                key={inc.id}
                className={`cfs-mark pri-${inc.priority} conf-${inc.locationConfidence} ${sel ? "selected" : ""}`}
                transform={`translate(${x},${y})`}
                onClick={() => onSelectCfs?.(inc.id)}
                style={{ cursor: onSelectCfs ? "pointer" : "default" }}
              >
                <circle className="cfs-aura" r={inc.locationConfidence === "unverified" ? 3.2 : 2.4} />
                <path
                  className="cfs-diamond"
                  d="M 0,-1.6 L 1.4,0 L 0,1.6 L -1.4,0 Z"
                />
                {sel && <circle className="cfs-select-ring" r="2.8" />}
              </g>
            );
          })}

          {/* Units — last known */}
          {activeUnits.map((u, i) => {
            const p = unitPos(u.zoneId, u.callsign, i);
            return (
              <g
                key={u.id}
                className={`unit-blip st-${u.status}`}
                transform={`translate(${p.x},${p.y})`}
              >
                {(u.status === "ER" || u.status === "DIS" || u.status === "EMR") && (
                  <circle className="unit-pulse" r="1.6" cx="0" cy="0" />
                )}
                <circle className="unit-core" r="1.15" cx="0" cy="0" />
                <text className="unit-cs mono" x="1.8" y="0.45">
                  {u.callsign}
                </text>
              </g>
            );
          })}

          {/* Scanlines + vignette frame */}
          <rect width="100" height="100" fill="url(#tacScan)" pointerEvents="none" />
          <rect
            x="0.4"
            y="0.4"
            width="99.2"
            height="99.2"
            fill="none"
            stroke="rgba(56,190,235,0.22)"
            strokeWidth="0.35"
            pointerEvents="none"
          />
          <rect
            x="1.2"
            y="1.2"
            width="97.6"
            height="97.6"
            fill="none"
            stroke="rgba(56,190,235,0.08)"
            strokeWidth="0.2"
            pointerEvents="none"
          />
          {/* Corner ticks */}
          {[
            [2, 2, 6, 2, 2, 6],
            [98, 2, 94, 2, 98, 6],
            [2, 98, 6, 98, 2, 94],
            [98, 98, 94, 98, 98, 94],
          ].map((t, i) => (
            <path
              key={i}
              d={`M ${t[0]} ${t[1]} L ${t[2]} ${t[3]} M ${t[0]} ${t[1]} L ${t[4]} ${t[5]}`}
              stroke="rgba(56,190,235,0.45)"
              strokeWidth="0.35"
              fill="none"
            />
          ))}
        </svg>

        <div className="tactical-legend">
          <div className="leg-row">
            <span className="led conf-unverified" /> UNVER
            <span className="led conf-partial" /> PART
            <span className="led conf-verified" /> VER
            <span className="led conf-conflicting" /> CONF
          </div>
          <div className="leg-row dim">
            <span className="led unit-avl" /> AVL
            <span className="led unit-er" /> ER/DIS
            <span className="led unit-os" /> OS
            <span className="led unit-emr" /> EMR
          </div>
          <div className="leg-row mono dim">◆ CFS · ● UNIT LAST-KNOWN</div>
        </div>
      </div>
    </div>
  );
}
