import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { Incident, Unit } from "@sector305/core";
import {
  HELO_LAYER_ID,
  OPS_LAYER_ID,
  TRAF_LAYER_ID,
  defaultVisibility,
  loadAirTracks,
  loadMiamiBasemap,
  loadTrafficPulse,
  radarChannels,
  type AirTrack,
  type MiamiManifest,
  type ProjectedLayer,
  type TrafficSeg,
} from "./geo/miamiBasemap";
import { consoleAudio } from "./audio/consoleAudio";

/** Sector plate ops zones — fiction SE305-A07 (viewBox 0..100 × 0..100). */
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

const WORLD = { min: -20, max: 120, size: 140 };
const MIN_VIEW = 8;
const MAX_VIEW = 160;
const VIEW_KEY = "s305.map.view";

type ViewBox = { x: number; y: number; w: number; h: number };

function loadView(): ViewBox {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return { x: 0, y: 0, w: 100, h: 100 };
    const j = JSON.parse(raw) as ViewBox;
    if (
      typeof j.x === "number" &&
      typeof j.y === "number" &&
      typeof j.w === "number" &&
      typeof j.h === "number"
    ) {
      return clampView(j);
    }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0, w: 100, h: 100 };
}

function saveView(vb: ViewBox) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(vb));
  } catch {
    /* ignore */
  }
}

type MapHit =
  | {
      kind: "cfs";
      id: string;
      title: string;
      lines: string[];
      x: number;
      y: number;
    }
  | {
      kind: "unit";
      id: string;
      title: string;
      lines: string[];
      x: number;
      y: number;
    }
  | {
      kind: "ops";
      id: string;
      title: string;
      lines: string[];
      x: number;
      y: number;
    }
  | {
      kind: "gis";
      id: string;
      layerId: string;
      title: string;
      lines: string[];
      x: number;
      y: number;
    }
  | {
      kind: "probe";
      id: "probe";
      title: string;
      lines: string[];
      x: number;
      y: number;
    };

type CtxMenu = {
  screenX: number;
  screenY: number;
  plateX: number;
  plateY: number;
  hit: MapHit | null;
};

type PanelPos = { x: number; y: number };

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

function clampView(vb: ViewBox): ViewBox {
  let { x, y, w, h } = vb;
  w = Math.min(MAX_VIEW, Math.max(MIN_VIEW, w));
  h = Math.min(MAX_VIEW, Math.max(MIN_VIEW, h));
  // keep mostly over world
  const min = WORLD.min - w * 0.25;
  const max = WORLD.max + w * 0.25;
  x = Math.min(max - w, Math.max(min, x));
  y = Math.min(max - h, Math.max(min, y));
  return { x, y, w, h };
}

function clientToPlate(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 50, y: 50 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function loadPanelPos(key: string, fallback: PanelPos): PanelPos {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const j = JSON.parse(raw) as PanelPos;
    if (typeof j.x === "number" && typeof j.y === "number") return j;
  } catch {
    /* ignore */
  }
  return fallback;
}

function savePanelPos(key: string, pos: PanelPos) {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

/** Draggable floating chrome block (radar / data). */
function DraggableBlock(props: {
  storageKey: string;
  className: string;
  defaultPos: PanelPos;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  ariaLabel: string;
}) {
  const [pos, setPos] = useState<PanelPos>(() =>
    loadPanelPos(props.storageKey, props.defaultPos)
  );
  const drag = useRef<{
    ox: number;
    oy: number;
    sx: number;
    sy: number;
  } | null>(null);

  function onPointerDown(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, label")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY };
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.sx);
    const ny = drag.current.oy + (e.clientY - drag.current.sy);
    setPos({ x: nx, y: ny });
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (!drag.current) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setPos((p) => {
      const clamped = {
        x: Math.max(0, Math.min(window.innerWidth - 80, p.x)),
        y: Math.max(0, Math.min(window.innerHeight - 40, p.y)),
      };
      // clamp relative to parent later; stage-relative is fine
      savePanelPos(props.storageKey, p);
      return p;
    });
  }

  return (
    <aside
      className={`map-float ${props.className}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      aria-label={props.ariaLabel}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className="map-float-head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="map-float-grip" title="Drag to move" />
        <div className="map-float-title">{props.title}</div>
        {props.meta && <div className="map-float-meta">{props.meta}</div>}
      </div>
      <div className="map-float-body">{props.children}</div>
    </aside>
  );
}

function GisBasemapLayers({
  layers,
  visible,
  selectedId,
  onHit,
}: {
  layers: ProjectedLayer[];
  visible: Record<string, boolean>;
  selectedId: string | null;
  onHit: (hit: MapHit, e: ReactMouseEvent) => void;
}) {
  return (
    <g className="gis-basemap">
      {layers.map((layer) => {
        if (!visible[layer.id]) return null;

        if (layer.kind === "polygon") {
          const isBoundary = layer.id === "city-boundary";
          const isDistrict = layer.id === "police-districts";
          const isNet = layer.id === "police-neighborhoods";
          const isZone = layer.id === "police-zones";
          const isCode = layer.id === "code-enforcement";
          return (
            <g key={layer.id} className={`gis-layer gis-${layer.id}`}>
              {layer.features.map((f) => {
                const sel = selectedId === f.id;
                return (
                  <g
                    key={f.id}
                    className={`gis-feat ${sel ? "is-selected" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onHit(
                        {
                          kind: "gis",
                          id: f.id,
                          layerId: layer.id,
                          title: f.label || layer.id,
                          lines: [
                            `LAYER ${layer.id}`,
                            f.label ? `NAME ${f.label}` : "—",
                            `PLATE ${f.labelX.toFixed(1)}, ${f.labelY.toFixed(1)}`,
                          ],
                          x: f.labelX,
                          y: f.labelY,
                        },
                        e
                      );
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onHit(
                        {
                          kind: "gis",
                          id: f.id,
                          layerId: layer.id,
                          title: f.label || layer.id,
                          lines: [
                            `LAYER ${layer.id}`,
                            f.label ? `NAME ${f.label}` : "—",
                            `PLATE ${f.labelX.toFixed(1)}, ${f.labelY.toFixed(1)}`,
                          ],
                          x: f.labelX,
                          y: f.labelY,
                        },
                        e
                      );
                    }}
                  >
                    <polygon
                      points={f.points}
                      className={
                        isBoundary
                          ? "gis-boundary-fill"
                          : isDistrict
                            ? "gis-district-fill"
                            : isNet
                              ? "gis-net-fill"
                              : isZone
                                ? "gis-zone-fill"
                                : isCode
                                  ? "gis-code-fill"
                                  : "gis-poly-fill"
                      }
                    />
                    <polygon
                      points={f.points}
                      className={
                        isBoundary
                          ? "gis-boundary-edge"
                          : isDistrict
                            ? "gis-district-edge"
                            : isNet
                              ? "gis-net-edge"
                              : isZone
                                ? "gis-zone-edge"
                                : isCode
                                  ? "gis-code-edge"
                                  : "gis-poly-edge"
                      }
                    />
                    {(isDistrict || isNet || isCode) && f.label && (
                      <text
                        x={f.labelX}
                        y={f.labelY}
                        className={
                          isDistrict
                            ? "gis-district-label"
                            : isNet
                              ? "gis-net-label"
                              : "gis-code-label"
                        }
                      >
                        {isDistrict ? `PD · ${f.label.toUpperCase()}` : f.label.toUpperCase()}
                      </text>
                    )}
                    {isZone && f.label && (
                      <text x={f.labelX} y={f.labelY} className="gis-zone-label">
                        {f.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        }

        if (layer.kind === "line") {
          const isEvac = layer.id === "evac-routes";
          return (
            <g key={layer.id} className={`gis-layer gis-${layer.id}`}>
              {layer.features.map((f) => (
                <g key={f.id}>
                  {/* wide invisible hit stroke */}
                  <path
                    d={f.d}
                    className="gis-line-hit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHit(
                        {
                          kind: "gis",
                          id: f.id,
                          layerId: layer.id,
                          title: f.label || (isEvac ? "EVAC ROUTE" : "ROAD"),
                          lines: [
                            `LAYER ${layer.id}`,
                            f.label ? `NAME ${f.label}` : "segment",
                          ],
                          x: 50,
                          y: 50,
                        },
                        e
                      );
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onHit(
                        {
                          kind: "gis",
                          id: f.id,
                          layerId: layer.id,
                          title: f.label || (isEvac ? "EVAC ROUTE" : "ROAD"),
                          lines: [
                            `LAYER ${layer.id}`,
                            f.label ? `NAME ${f.label}` : "segment",
                          ],
                          x: 50,
                          y: 50,
                        },
                        e
                      );
                    }}
                  />
                  <path
                    d={f.d}
                    className={isEvac ? "gis-evac-line" : "gis-road-line"}
                    pointerEvents="none"
                  />
                </g>
              ))}
            </g>
          );
        }

        const isFire = layer.id === "fire-stations";
        return (
          <g key={layer.id} className={`gis-layer gis-${layer.id}`}>
            {layer.features.map((f) => {
              const sel = selectedId === f.id;
              return (
                <g
                  key={f.id}
                  className={`gis-feat ${sel ? "is-selected" : ""}`}
                  transform={`translate(${f.x},${f.y})`}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHit(
                      {
                        kind: "gis",
                        id: f.id,
                        layerId: layer.id,
                        title: f.label || (isFire ? "FIRE STATION" : "LANDMARK"),
                        lines: [
                          `LAYER ${layer.id}`,
                          f.label ? `NAME ${f.label}` : "—",
                          `PLATE ${f.x.toFixed(1)}, ${f.y.toFixed(1)}`,
                        ],
                        x: f.x,
                        y: f.y,
                      },
                      e
                    );
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onHit(
                      {
                        kind: "gis",
                        id: f.id,
                        layerId: layer.id,
                        title: f.label || (isFire ? "FIRE STATION" : "LANDMARK"),
                        lines: [
                          `LAYER ${layer.id}`,
                          f.label ? `NAME ${f.label}` : "—",
                          `PLATE ${f.x.toFixed(1)}, ${f.y.toFixed(1)}`,
                        ],
                        x: f.x,
                        y: f.y,
                      },
                      e
                    );
                  }}
                >
                  {/* hit pad */}
                  <circle r="2.2" className="gis-point-hit" />
                  {isFire ? (
                    <>
                      <circle className="gis-fire-ring" r="1.1" />
                      <path
                        className="gis-fire-cross"
                        d="M -0.55,0 L 0.55,0 M 0,-0.55 L 0,0.55"
                      />
                    </>
                  ) : (
                    <circle className="gis-poi" r="0.55" />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function RadarStackBody(props: {
  channels: Array<{ id: string; short: string; label: string; group: string }>;
  visible: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSolo: (id: string) => void;
  onAllOn: () => void;
  onDefaults: () => void;
  status: "loading" | "ready" | "error";
}) {
  const { channels, visible, onToggle, onSolo, onAllOn, onDefaults, status } = props;
  const onCount = channels.filter((c) => visible[c.id]).length;

  return (
    <>
      <div className="radar-actions">
        <button type="button" className="radar-act" onClick={onDefaults} title="Restore defaults">
          DFLT
        </button>
        <button type="button" className="radar-act" onClick={onAllOn} title="All layers on">
          ALL
        </button>
      </div>
      <ul className="radar-channels">
        {channels.map((ch) => {
          const on = !!visible[ch.id];
          return (
            <li key={ch.id}>
              <button
                type="button"
                className={`radar-ch ${on ? "on" : "off"} group-${ch.group}`}
                onClick={() => onToggle(ch.id)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  onSolo(ch.id);
                }}
                title={`${ch.label} — click toggle · double-click solo`}
                aria-pressed={on}
              >
                <span className={`radar-led ${on ? "lit" : ""}`} />
                <span className="radar-short mono">{ch.short}</span>
                <span className="radar-label">{ch.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="radar-foot mono">
        {status === "ready" ? `${onCount}/${channels.length} · ` : ""}
        DRAG HDR · CLK TOG · DBL SOLO
      </div>
    </>
  );
}

export function SectorMap(props: {
  incidents: Incident[];
  units: Unit[];
  selectedId: string | null;
  /** Unit highlighted from status board or map click. */
  selectedUnitId?: string | null;
  clockMs: number;
  sectorId: string;
  onSelectCfs?: (id: string) => void;
  onSelectUnit?: (id: string | null) => void;
  /** Fired when radar visibility changes (coach gates HELO/TRAF). */
  onRadarVisibility?: (vis: Record<string, boolean>) => void;
}) {
  const {
    incidents,
    units,
    selectedId,
    selectedUnitId = null,
    clockMs,
    sectorId,
    onSelectCfs,
    onSelectUnit,
    onRadarVisibility,
  } = props;
  const open = incidents.filter(
    (i) => i.status !== "CLEARED" && i.status !== "CANCELLED"
  );
  const activeUnits = units.filter((u) => u.status !== "OOS");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [gisLayers, setGisLayers] = useState<ProjectedLayer[]>([]);
  const [gisMeta, setGisMeta] = useState<MiamiManifest | null>(null);
  const [gisStatus, setGisStatus] = useState<"loading" | "ready" | "error">("loading");
  const [visible, setVisible] = useState<Record<string, boolean>>({
    [OPS_LAYER_ID]: true,
    [HELO_LAYER_ID]: false,
    [TRAF_LAYER_ID]: false,
  });
  const [airTracks, setAirTracks] = useState<AirTrack[]>([]);
  const [traffic, setTraffic] = useState<TrafficSeg[]>([]);

  const [view, setView] = useState<ViewBox>(() => loadView());
  const [hit, setHit] = useState<MapHit | null>(null);
  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const [panning, setPanning] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [mapFocus, setMapFocus] = useState(false);

  const panRef = useRef<{
    active: boolean;
    moved: boolean;
    sx: number;
    sy: number;
    vx: number;
    vy: number;
    button: number;
  } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const ac = new AbortController();
    loadMiamiBasemap(ac.signal)
      .then(({ manifest, layers }) => {
        setGisMeta(manifest);
        setGisLayers(layers);
        setVisible(defaultVisibility(manifest));
        setGisStatus("ready");
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        console.warn("[SectorMap] Miami basemap load failed", err);
        setGisStatus("error");
      });
    loadAirTracks(ac.signal)
      .then(setAirTracks)
      .catch(() => setAirTracks([]));
    loadTrafficPulse(ac.signal)
      .then(setTraffic)
      .catch(() => setTraffic([]));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    onRadarVisibility?.(visible);
  }, [visible, onRadarVisibility]);

  // persist view (debounced via rAF batch)
  useEffect(() => {
    saveView(view);
  }, [view]);

  // close context menu on outside click / escape
  useEffect(() => {
    if (!ctx) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtx(null);
    };
    const onDown = () => setCtx(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [ctx]);

  const channels = useMemo(
    () =>
      gisMeta
        ? radarChannels(gisMeta)
        : [
            {
              id: OPS_LAYER_ID,
              short: "OPS",
              label: "Ops zones (SE305)",
              group: "tracks",
            },
          ],
    [gisMeta]
  );

  function toggleLayer(id: string) {
    setVisible((v) => {
      const next = { ...v, [id]: !v[id] };
      if (id === HELO_LAYER_ID && next[id]) consoleAudio.play("heloPass");
      return next;
    });
    consoleAudio.play("ui");
  }

  function soloLayer(id: string) {
    setVisible((v) => {
      const next: Record<string, boolean> = {};
      for (const ch of channels) next[ch.id] = ch.id === id;
      for (const k of Object.keys(v)) if (!(k in next)) next[k] = false;
      return next;
    });
    consoleAudio.play("ui");
  }

  function allOn() {
    setVisible(() => {
      const next: Record<string, boolean> = {};
      for (const ch of channels) next[ch.id] = true;
      return next;
    });
    consoleAudio.play("ui");
  }

  function restoreDefaults() {
    if (gisMeta) setVisible(defaultVisibility(gisMeta));
    else setVisible({ [OPS_LAYER_ID]: true });
    consoleAudio.play("ui");
  }

  const zoomAt = useCallback((plateX: number, plateY: number, factor: number) => {
    setView((vb) => {
      const nw = vb.w * factor;
      const nh = vb.h * factor;
      if (nw < MIN_VIEW || nw > MAX_VIEW) return vb;
      // keep plate point fixed
      const rx = (plateX - vb.x) / vb.w;
      const ry = (plateY - vb.y) / vb.h;
      return clampView({
        x: plateX - rx * nw,
        y: plateY - ry * nh,
        w: nw,
        h: nh,
      });
    });
  }, []);

  function resetView() {
    const home = { x: 0, y: 0, w: 100, h: 100 };
    setView(home);
    saveView(home);
    consoleAudio.play("ui");
  }

  function centerOn(x: number, y: number) {
    setView((vb) =>
      clampView({
        x: x - vb.w / 2,
        y: y - vb.h / 2,
        w: vb.w,
        h: vb.h,
      })
    );
  }

  // keyboard nav when map stage focused
  useEffect(() => {
    if (!mapFocus) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const vb = viewRef.current;
      const step = vb.w * 0.12;
      if (e.key === "Escape") {
        setCtx(null);
        setHit(null);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, 0.85);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, 1.18);
        return;
      }
      if (e.key === "0" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        resetView();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setView((v) => clampView({ ...v, x: v.x - step }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setView((v) => clampView({ ...v, x: v.x + step }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setView((v) => clampView({ ...v, y: v.y - step }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setView((v) => clampView({ ...v, y: v.y + step }));
      } else if (e.key === "c" || e.key === "C") {
        if (hit) {
          centerOn(hit.x, hit.y);
          consoleAudio.play("ui");
        }
      } else if (e.key === "f" || e.key === "F") {
        if (hit?.kind === "cfs") {
          onSelectCfs?.(hit.id);
          centerOn(hit.x, hit.y);
          consoleAudio.play("ding");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapFocus, hit, onSelectCfs, zoomAt]);

  function applyHit(next: MapHit, e: ReactMouseEvent) {
    if (e.type === "contextmenu" || e.button === 2) {
      e.preventDefault();
      setHit(next);
      const stage = stageRef.current?.getBoundingClientRect();
      setCtx({
        screenX: e.clientX - (stage?.left ?? 0),
        screenY: e.clientY - (stage?.top ?? 0),
        plateX: next.x,
        plateY: next.y,
        hit: next,
      });
      consoleAudio.play("ui");
      return;
    }
    // left click
    setHit(next);
    setCtx(null);
    if (next.kind === "cfs") {
      onSelectCfs?.(next.id);
      onSelectUnit?.(null);
      consoleAudio.play("ding");
    } else if (next.kind === "unit") {
      onSelectUnit?.(next.id);
      consoleAudio.play("ui");
    } else {
      onSelectUnit?.(null);
      consoleAudio.play("ui");
    }
  }

  function onSvgPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 && e.button !== 1) return;
    const t = e.target as Element | null;
    // let LMB click land on features without starting a pan
    if (
      e.button === 0 &&
      t &&
      t !== e.currentTarget &&
      t.closest?.(
        ".gis-feat, .zone-layer, .cfs-mark, .unit-blip, .gis-line-hit, .gis-point-hit"
      )
    ) {
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    panRef.current = {
      active: true,
      moved: false,
      sx: e.clientX,
      sy: e.clientY,
      vx: view.x,
      vy: view.y,
      button: e.button,
    };
    setPanning(true);
  }

  function onSvgPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (svg) {
      const pt = clientToPlate(svg, e.clientX, e.clientY);
      setCursor(pt);
    }
    const p = panRef.current;
    if (!p?.active || !svg) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    if (!p.moved && Math.hypot(dx, dy) < 3) return;
    p.moved = true;
    const rect = svg.getBoundingClientRect();
    const scaleX = view.w / Math.max(1, rect.width);
    const scaleY = view.h / Math.max(1, rect.height);
    setView((vb) =>
      clampView({
        ...vb,
        x: p.vx - dx * scaleX,
        y: p.vy - dy * scaleY,
      })
    );
  }

  function onSvgPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const p = panRef.current;
    const svg = svgRef.current;
    if (svg) {
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (p?.active && !p.moved && p.button === 0 && svg) {
      // bare left click on void → probe
      const pt = clientToPlate(svg, e.clientX, e.clientY);
      setHit({
        kind: "probe",
        id: "probe",
        title: "PROBE",
        lines: [
          `PLATE ${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}`,
          `VIEW ${view.w.toFixed(0)}×${view.h.toFixed(0)}`,
          "LMB feature · RMB menu · wheel zoom",
        ],
        x: pt.x,
        y: pt.y,
      });
      setCtx(null);
    }
    panRef.current = null;
    setPanning(false);
  }

  function onSvgWheel(e: ReactWheelEvent<SVGSVGElement>) {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = clientToPlate(svg, e.clientX, e.clientY);
    const factor = e.deltaY > 0 ? 1.12 : 0.89;
    zoomAt(pt.x, pt.y, factor);
  }

  function onSvgContextMenu(e: ReactMouseEvent<SVGSVGElement>) {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = clientToPlate(svg, e.clientX, e.clientY);
    const stage = stageRef.current?.getBoundingClientRect();
    const probe: MapHit = {
      kind: "probe",
      id: "probe",
      title: "MAP POINT",
      lines: [`PLATE ${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}`],
      x: pt.x,
      y: pt.y,
    };
    setHit(probe);
    setCtx({
      screenX: e.clientX - (stage?.left ?? 0),
      screenY: e.clientY - (stage?.top ?? 0),
      plateX: pt.x,
      plateY: pt.y,
      hit: probe,
    });
    consoleAudio.play("ui");
  }

  function onSvgDoubleClick(e: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = clientToPlate(svg, e.clientX, e.clientY);
    zoomAt(pt.x, pt.y, 0.72);
    consoleAudio.play("tick");
  }

  async function copyPlate(x: number, y: number) {
    const text = `${x.toFixed(3)}, ${y.toFixed(3)}`;
    try {
      await navigator.clipboard.writeText(text);
      consoleAudio.play("export");
    } catch {
      consoleAudio.play("ui");
    }
  }

  const opsOn = visible[OPS_LAYER_ID] !== false;
  const heloOn = !!visible[HELO_LAYER_ID];
  const trafOn = !!visible[TRAF_LAYER_ID];
  const anyGisOn = gisLayers.some((l) => visible[l.id]);
  const zoomPct = Math.round((100 / view.w) * 100);

  const dataLines = hit?.lines ?? [
    "LMB select · drag pan",
    "RMB context · wheel zoom",
    "Drag panel headers to move",
  ];

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
          {gisStatus === "ready" && (
            <span className="tac-mode gis-badge" title={gisMeta?.disclaimer ?? ""}>
              GIS · MIA · RADAR
            </span>
          )}
          <span className="tac-mode dim mono">{zoomPct}%</span>
        </div>
        <div className="tac-right">
          <div className="tac-nav">
            <button
              type="button"
              className="tac-nav-btn"
              title="Zoom in"
              onClick={() => zoomAt(view.x + view.w / 2, view.y + view.h / 2, 0.8)}
            >
              +
            </button>
            <button
              type="button"
              className="tac-nav-btn"
              title="Zoom out"
              onClick={() => zoomAt(view.x + view.w / 2, view.y + view.h / 2, 1.25)}
            >
              −
            </button>
            <button type="button" className="tac-nav-btn" title="Reset view" onClick={resetView}>
              ⌂
            </button>
          </div>
          <span className="tac-clock mono">T+{(clockMs / 1000).toFixed(1)}s</span>
          <span className="tac-counts mono">
            CFS {open.length} · U {activeUnits.length}
          </span>
        </div>
      </div>

      <div
        className={`tactical-stage ${panning ? "is-panning" : ""} ${mapFocus ? "is-focused" : ""}`}
        ref={stageRef}
        tabIndex={0}
        onFocus={() => setMapFocus(true)}
        onBlur={() => setMapFocus(false)}
        onMouseEnter={() => setMapFocus(true)}
      >
        <DraggableBlock
          storageKey="s305.panel.radar"
          className="radar-stack"
          defaultPos={{ x: 8, y: 8 }}
          ariaLabel="Plate radar layer stack"
          title={
            <>
              <span className="radar-title">RADAR</span>
            </>
          }
          meta={
            <span className="radar-meta mono">
              {gisStatus === "ready"
                ? "LIVE"
                : gisStatus === "loading"
                  ? "…"
                  : "OFF"}
            </span>
          }
        >
          <RadarStackBody
            channels={channels}
            visible={visible}
            onToggle={toggleLayer}
            onSolo={soloLayer}
            onAllOn={allOn}
            onDefaults={restoreDefaults}
            status={gisStatus}
          />
        </DraggableBlock>

        <DraggableBlock
          storageKey="s305.panel.data"
          className="data-block"
          defaultPos={{ x: 8, y: 220 }}
          ariaLabel="Map data block"
          title={<span className="data-title">DATA</span>}
          meta={
            <span className="data-kind mono">
              {hit ? hit.kind.toUpperCase() : "IDLE"}
            </span>
          }
        >
          <div className="data-block-title mono">{hit?.title ?? "NO SELECTION"}</div>
          <ul className="data-block-lines">
            {dataLines.map((line, i) => (
              <li key={i} className="mono">
                {line}
              </li>
            ))}
          </ul>
          {hit && hit.kind === "cfs" && (
            <button
              type="button"
              className="data-act"
              onClick={() => {
                onSelectCfs?.(hit.id);
                centerOn(hit.x, hit.y);
                consoleAudio.play("ding");
              }}
            >
              FOCUS CFS
            </button>
          )}
          {hit && hit.kind !== "probe" && (
            <button
              type="button"
              className="data-act"
              onClick={() => {
                centerOn(hit.x, hit.y);
                consoleAudio.play("ui");
              }}
            >
              CENTER
            </button>
          )}
          <button
            type="button"
            className="data-act dim"
            onClick={() => {
              setHit(null);
              consoleAudio.play("ui");
            }}
          >
            CLEAR
          </button>
        </DraggableBlock>

        <svg
          ref={svgRef}
          className="tactical-svg"
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="application"
          aria-label="SE305-A07 interactive sector map — pan, zoom, select"
          onPointerDown={onSvgPointerDown}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          onPointerCancel={onSvgPointerUp}
          onWheel={onSvgWheel}
          onContextMenu={onSvgContextMenu}
          onDoubleClick={onSvgDoubleClick}
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

          {/* Infinite-ish void under world */}
          <rect
            x={WORLD.min}
            y={WORLD.min}
            width={WORLD.size}
            height={WORLD.size}
            fill="url(#bayGlow)"
          />
          <rect
            x={WORLD.min}
            y={WORLD.min}
            width={WORLD.size}
            height={WORLD.size}
            fill="url(#tacGrid)"
          />

          <path
            d="M 78 0 L 100 0 L 100 100 L 88 100 L 82 70 L 86 40 L 80 0 Z"
            fill="url(#oceanFill)"
            opacity={anyGisOn ? 0.45 : 1}
            pointerEvents="none"
          />
          <path
            d="M 0 45 Q 18 50 22 70 L 8 100 L 0 100 Z"
            fill="rgba(8,40,55,0.45)"
            opacity={anyGisOn ? 0.5 : 1}
            pointerEvents="none"
          />

          {gisLayers.length > 0 && (
            <GisBasemapLayers
              layers={gisLayers}
              visible={visible}
              selectedId={hit?.kind === "gis" ? hit.id : null}
              onHit={applyHit}
            />
          )}

          <path
            d="M 30 62 L 72 48"
            stroke="rgba(56,190,235,0.12)"
            strokeWidth="0.35"
            strokeDasharray="1.2 0.8"
            fill="none"
            pointerEvents="none"
          />
          <path
            d="M 34 70 L 70 58"
            stroke="rgba(56,190,235,0.08)"
            strokeWidth="0.25"
            strokeDasharray="0.8 1"
            fill="none"
            pointerEvents="none"
          />

          {/* Traffic congestion flavor */}
          {trafOn && (
            <g className="traf-layer" aria-hidden>
              {traffic.map((seg) => (
                <g key={seg.id}>
                  <path
                    d={seg.d}
                    className={`traf-line traf-${seg.level}`}
                    fill={seg.d.includes("Z") ? undefined : "none"}
                  />
                  {/* label at path start-ish via first numbers — skip complex */}
                </g>
              ))}
            </g>
          )}

          {opsOn &&
            ZONES.map((z) => {
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
              const sel = hit?.kind === "ops" && hit.id === z.id;
              return (
                <g
                  key={z.id}
                  className={`zone-layer ${confClass(conf)} ${hot ? "zone-hot" : ""} ${sel ? "is-selected" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    applyHit(
                      {
                        kind: "ops",
                        id: z.id,
                        title: z.name,
                        lines: [
                          `OPS ${z.short}`,
                          z.handoff ? "HANDOFF REQUIRED" : "IN-SECTOR",
                          `CFS OPEN ${cfsHere.length}`,
                          conf !== "none" ? `CONF ${conf.toUpperCase()}` : "CONF —",
                          `PLATE ${z.label.x}, ${z.label.y}`,
                        ],
                        x: z.label.x,
                        y: z.label.y,
                      },
                      e
                    );
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyHit(
                      {
                        kind: "ops",
                        id: z.id,
                        title: z.name,
                        lines: [
                          `OPS ${z.short}`,
                          z.handoff ? "HANDOFF REQUIRED" : "IN-SECTOR",
                          `CFS OPEN ${cfsHere.length}`,
                          `PLATE ${z.label.x}, ${z.label.y}`,
                        ],
                        x: z.label.x,
                        y: z.label.y,
                      },
                      e
                    );
                  }}
                >
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

          {open.map((inc) => {
            const z = ZONES.find((zz) => zz.id === inc.location.zoneId);
            if (!z) return null;
            const idx = open
              .filter((i) => i.location.zoneId === inc.location.zoneId)
              .indexOf(inc);
            const x = z.label.x + (idx % 3) * 2.2 - 2;
            const y = z.label.y + 5 + Math.floor(idx / 3) * 3;
            const sel = inc.id === selectedId || (hit?.kind === "cfs" && hit.id === inc.id);
            return (
              <g
                key={inc.id}
                className={`cfs-mark pri-${inc.priority} conf-${inc.locationConfidence} ${sel ? "selected" : ""}`}
                transform={`translate(${x},${y})`}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  applyHit(
                    {
                      kind: "cfs",
                      id: inc.id,
                      title: `${inc.cfsNumber} · ${inc.priority}`,
                      lines: [
                        inc.natureText,
                        inc.location.freeform,
                        `STATUS ${inc.status}`,
                        `LOC ${inc.locationConfidence}`,
                        `ZONE ${inc.location.zoneId}`,
                        `FLAGS ${inc.flags.join(",") || "—"}`,
                      ],
                      x,
                      y,
                    },
                    e
                  );
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyHit(
                    {
                      kind: "cfs",
                      id: inc.id,
                      title: `${inc.cfsNumber} · ${inc.priority}`,
                      lines: [
                        inc.natureText,
                        inc.location.freeform,
                        `STATUS ${inc.status}`,
                        `LOC ${inc.locationConfidence}`,
                      ],
                      x,
                      y,
                    },
                    e
                  );
                }}
              >
                <circle
                  className="cfs-aura"
                  r={inc.locationConfidence === "unverified" ? 3.2 : 2.4}
                />
                <path className="cfs-diamond" d="M 0,-1.6 L 1.4,0 L 0,1.6 L -1.4,0 Z" />
                {sel && <circle className="cfs-select-ring" r="2.8" />}
              </g>
            );
          })}

          {activeUnits.map((u, i) => {
            const p = unitPos(u.zoneId, u.callsign, i);
            const sel =
              selectedUnitId === u.id || (hit?.kind === "unit" && hit.id === u.id);
            return (
              <g
                key={u.id}
                className={`unit-blip st-${u.status} ${sel ? "is-selected" : ""}`}
                transform={`translate(${p.x},${p.y})`}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  applyHit(
                    {
                      kind: "unit",
                      id: u.id,
                      title: u.callsign,
                      lines: [
                        `STATUS ${u.status}`,
                        `ZONE ${u.zoneId}`,
                        u.assignedIncidentId
                          ? `ASG ${incidents.find((x) => x.id === u.assignedIncidentId)?.cfsNumber ?? u.assignedIncidentId}`
                          : "ASG —",
                        "LAST-KNOWN (imperfect)",
                      ],
                      x: p.x,
                      y: p.y,
                    },
                    e
                  );
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyHit(
                    {
                      kind: "unit",
                      id: u.id,
                      title: u.callsign,
                      lines: [
                        `STATUS ${u.status}`,
                        `ZONE ${u.zoneId}`,
                        "LAST-KNOWN (imperfect)",
                      ],
                      x: p.x,
                      y: p.y,
                    },
                    e
                  );
                }}
              >
                <circle r="2.4" className="unit-hit" />
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

          {/* Helicopters / air last-known */}
          {heloOn &&
            airTracks.map((a) => (
              <g
                key={a.id}
                className={`air-track kind-${a.kind} st-${a.status}`}
                transform={`translate(${a.x},${a.y})`}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  consoleAudio.play("heloPass");
                  applyHit(
                    {
                      kind: "gis",
                      id: a.id,
                      layerId: HELO_LAYER_ID,
                      title: a.callsign,
                      lines: [
                        `KIND ${a.kind.toUpperCase()}`,
                        `AGENCY ${a.agency}`,
                        `STATUS ${a.status}`,
                        `ALT ${a.altFt} ft`,
                        a.note,
                        "LAST-KNOWN · NOT LIVE ADS-B",
                      ],
                      x: a.x,
                      y: a.y,
                    },
                    e
                  );
                }}
              >
                {a.kind === "helo" ? (
                  <>
                    <ellipse className="helo-rotor" cx="0" cy="0" rx="2.4" ry="0.7" />
                    <ellipse className="helo-rotor spin" cx="0" cy="0" rx="0.7" ry="2.2" />
                    <circle className="helo-body" r="0.85" />
                  </>
                ) : (
                  <path className="fw-body" d="M -2,0 L 2,-0.6 L 2,0.6 Z" />
                )}
                <text className="air-cs mono" x="2.2" y="0.4">
                  {a.callsign}
                </text>
              </g>
            ))}

          {/* selection probe ring */}
          {hit && (
            <g className="probe-mark" pointerEvents="none">
              <circle cx={hit.x} cy={hit.y} r="2.8" className="probe-ring" />
              <path
                d={`M ${hit.x - 4} ${hit.y} L ${hit.x - 1.6} ${hit.y} M ${hit.x + 1.6} ${hit.y} L ${hit.x + 4} ${hit.y} M ${hit.x} ${hit.y - 4} L ${hit.x} ${hit.y - 1.6} M ${hit.x} ${hit.y + 1.6} L ${hit.x} ${hit.y + 4}`}
                className="probe-cross"
              />
            </g>
          )}

          <rect
            x={WORLD.min}
            y={WORLD.min}
            width={WORLD.size}
            height={WORLD.size}
            fill="url(#tacScan)"
            pointerEvents="none"
          />
          {/* world frame */}
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
              pointerEvents="none"
            />
          ))}
        </svg>

        {ctx && (
          <div
            className="map-ctx"
            style={{ left: ctx.screenX, top: ctx.screenY }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="map-ctx-head mono">
              {ctx.hit?.title ?? "MAP"} · {ctx.plateX.toFixed(1)},{ctx.plateY.toFixed(1)}
            </div>
            <button
              type="button"
              onClick={() => {
                centerOn(ctx.plateX, ctx.plateY);
                setCtx(null);
                consoleAudio.play("ui");
              }}
            >
              Center here
            </button>
            <button
              type="button"
              onClick={() => {
                zoomAt(ctx.plateX, ctx.plateY, 0.7);
                setCtx(null);
              }}
            >
              Zoom in
            </button>
            <button
              type="button"
              onClick={() => {
                zoomAt(ctx.plateX, ctx.plateY, 1.4);
                setCtx(null);
              }}
            >
              Zoom out
            </button>
            {ctx.hit?.kind === "cfs" && (
              <button
                type="button"
                onClick={() => {
                  onSelectCfs?.(ctx.hit!.id);
                  setHit(ctx.hit);
                  setCtx(null);
                  consoleAudio.play("ding");
                }}
              >
                Select CFS
              </button>
            )}
            {ctx.hit?.kind === "gis" && "layerId" in ctx.hit && (
              <button
                type="button"
                onClick={() => {
                  toggleLayer((ctx.hit as Extract<MapHit, { kind: "gis" }>).layerId);
                  setCtx(null);
                }}
              >
                Toggle layer
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void copyPlate(ctx.plateX, ctx.plateY);
                setCtx(null);
              }}
            >
              Copy coords
            </button>
            <button
              type="button"
              onClick={() => {
                resetView();
                setCtx(null);
              }}
            >
              Reset view
            </button>
            <button
              type="button"
              className="dim"
              onClick={() => {
                setHit(null);
                setCtx(null);
              }}
            >
              Clear select
            </button>
          </div>
        )}

        <div className="map-instrument-rail" aria-hidden>
          <div className="map-zone-legend mono">
            {ZONES.map((z) => (
              <span
                key={z.id}
                className={`mz-chip zone-${z.short.toLowerCase()} ${z.handoff ? "is-handoff" : ""}`}
                title={z.name}
              >
                {z.short}
              </span>
            ))}
          </div>
          <div className="map-scale-bar" title="Relative plate scale (fictional grid)">
            <div className="msb-label mono">
              SCALE <span className="msb-val">{Math.max(1, Math.round(view.w / 10))} u</span>
            </div>
            <div className="msb-track">
              <span className="msb-bar" />
              <span className="msb-ticks" />
              <span className="msb-mid" />
            </div>
          </div>
        </div>

        <div className="map-status mono" aria-hidden>
          <span>
            GRID{" "}
            {cursor
              ? `${cursor.x.toFixed(1)},${cursor.y.toFixed(1)}`
              : "—,—"}
          </span>
          <span>
            VIEW {view.x.toFixed(0)},{view.y.toFixed(0)} · {view.w.toFixed(0)}²
          </span>
          <span>ZOOM {zoomPct}%</span>
          {hit && <span className="map-status-hit">{hit.kind.toUpperCase()}</span>}
          {mapFocus && <span className="map-status-focus">KEYS</span>}
          <span className="map-status-dim">NO TRUTH PINS</span>
        </div>

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
          <div className="leg-row mono dim">
            WHEEL/DBLCLK ZOOM · DRAG PAN · ARROWS · ± · 0 · C CENTER · F CFS
          </div>
        </div>
      </div>
    </div>
  );
}
