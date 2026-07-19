/** City of Miami GIS basemap helpers for the SECTOR plate (prestige atmosphere only). */

export type GeoBBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

export type GeoLayerKind = "polygon" | "line" | "point";

export type MiamiLayerSpec = {
  id: string;
  file: string;
  kind: GeoLayerKind;
  z: number;
  defaultOn: boolean;
  labelProp?: string;
  /** Radar stack short code (e.g. DIST, ROAD). */
  short?: string;
  /** Human label for radar stack. */
  label?: string;
  group?: string;
};

export type MiamiManifest = {
  id: string;
  title: string;
  portal: string;
  attribution: string;
  disclaimer: string;
  crs: string;
  bbox: GeoBBox;
  viewPad: number;
  layers: MiamiLayerSpec[];
};

export type GeoJsonGeometry =
  | { type: "Point"; coordinates: number[] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJsonGeometry;
};

export type GeoJsonFC = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type ProjectedPoly = {
  id: string;
  points: string;
  label?: string;
  labelX: number;
  labelY: number;
};

export type ProjectedLine = {
  id: string;
  d: string;
  label?: string;
};

export type ProjectedPoint = {
  id: string;
  x: number;
  y: number;
  label?: string;
};

export type ProjectedLayer =
  | { id: string; kind: "polygon"; features: ProjectedPoly[] }
  | { id: string; kind: "line"; features: ProjectedLine[] }
  | { id: string; kind: "point"; features: ProjectedPoint[] };

const BASE = "/geo/miami";

/** Fiction ops overlay — always available as a radar channel. */
export const OPS_LAYER_ID = "ops-zones";
/** Synthetic aviation / helo last-known. */
export const HELO_LAYER_ID = "air-helo";
/** Synthetic traffic congestion flavor. */
export const TRAF_LAYER_ID = "traffic";

export function paddedBBox(bbox: GeoBBox, pad: number): GeoBBox {
  const dx = (bbox.maxLon - bbox.minLon) * pad;
  const dy = (bbox.maxLat - bbox.minLat) * pad;
  return {
    minLon: bbox.minLon - dx,
    minLat: bbox.minLat - dy,
    maxLon: bbox.maxLon + dx,
    maxLat: bbox.maxLat + dy,
  };
}

/** WGS84 → plate viewBox (0..100). Y flips so north is up. */
export function projectLonLat(
  lon: number,
  lat: number,
  box: GeoBBox
): { x: number; y: number } {
  const x = ((lon - box.minLon) / (box.maxLon - box.minLon)) * 100;
  const y = (1 - (lat - box.minLat) / (box.maxLat - box.minLat)) * 100;
  return { x, y };
}

function ringToPoints(ring: number[][], box: GeoBBox): string {
  return ring
    .map(([lon, lat]) => {
      const p = projectLonLat(lon, lat, box);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");
}

function lineToPath(coords: number[][], box: GeoBBox): string {
  if (!coords.length) return "";
  return coords
    .map(([lon, lat], i) => {
      const p = projectLonLat(lon, lat, box);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");
}

function centroidOfRing(ring: number[][]): { lon: number; lat: number } {
  let sx = 0;
  let sy = 0;
  const n = Math.max(1, ring.length - (ring.length > 1 ? 1 : 0));
  const limit = ring.length > 1 ? ring.length - 1 : ring.length;
  for (let i = 0; i < limit; i++) {
    sx += ring[i]![0]!;
    sy += ring[i]![1]!;
  }
  return { lon: sx / n, lat: sy / n };
}

function firstRing(geom: GeoJsonGeometry): number[][] | null {
  if (geom.type === "Polygon") return geom.coordinates[0] ?? null;
  if (geom.type === "MultiPolygon") return geom.coordinates[0]?.[0] ?? null;
  return null;
}

export function projectFeatureCollection(
  layerId: string,
  kind: GeoLayerKind,
  fc: GeoJsonFC,
  box: GeoBBox,
  labelProp?: string
): ProjectedLayer {
  if (kind === "polygon") {
    const features: ProjectedPoly[] = [];
    fc.features.forEach((ft, i) => {
      const ring = firstRing(ft.geometry);
      if (!ring) return;
      const c = centroidOfRing(ring);
      const p = projectLonLat(c.lon, c.lat, box);
      const label = labelProp
        ? String(ft.properties[labelProp] ?? "")
        : undefined;
      features.push({
        id: `${layerId}-${i}`,
        points: ringToPoints(ring, box),
        label: label || undefined,
        labelX: p.x,
        labelY: p.y,
      });
    });
    return { id: layerId, kind: "polygon", features };
  }

  if (kind === "line") {
    const features: ProjectedLine[] = [];
    fc.features.forEach((ft, i) => {
      const g = ft.geometry;
      let d = "";
      if (g.type === "LineString") d = lineToPath(g.coordinates, box);
      else if (g.type === "MultiLineString") {
        d = g.coordinates.map((c) => lineToPath(c, box)).filter(Boolean).join(" ");
      }
      if (!d) return;
      features.push({
        id: `${layerId}-${i}`,
        d,
        label: labelProp ? String(ft.properties[labelProp] ?? "") : undefined,
      });
    });
    return { id: layerId, kind: "line", features };
  }

  const features: ProjectedPoint[] = [];
  fc.features.forEach((ft, i) => {
    if (ft.geometry.type !== "Point") return;
    const [lon, lat] = ft.geometry.coordinates;
    if (lon == null || lat == null) return;
    const p = projectLonLat(lon, lat, box);
    if (p.x < -5 || p.x > 105 || p.y < -5 || p.y > 105) return;
    features.push({
      id: `${layerId}-${i}`,
      x: p.x,
      y: p.y,
      label: labelProp ? String(ft.properties[labelProp] ?? "") : undefined,
    });
  });
  return { id: layerId, kind: "point", features };
}

export function defaultVisibility(manifest: MiamiManifest): Record<string, boolean> {
  const vis: Record<string, boolean> = {
    [OPS_LAYER_ID]: true,
    [HELO_LAYER_ID]: false,
    [TRAF_LAYER_ID]: false,
  };
  for (const l of manifest.layers) {
    vis[l.id] = l.defaultOn;
  }
  return vis;
}

/** Radar channel list: fiction OPS + air/traffic + GIS layers. */
export function radarChannels(manifest: MiamiManifest): Array<{
  id: string;
  short: string;
  label: string;
  group: string;
}> {
  const gis = [...manifest.layers]
    .sort((a, b) => a.z - b.z)
    .map((l) => ({
      id: l.id,
      short: l.short ?? l.id.slice(0, 4).toUpperCase(),
      label: l.label ?? l.id,
      group: l.group ?? "gis",
    }));
  return [
    {
      id: OPS_LAYER_ID,
      short: "OPS",
      label: "Ops zones (SE305)",
      group: "tracks",
    },
    {
      id: HELO_LAYER_ID,
      short: "HELO",
      label: "Air / helicopters",
      group: "air",
    },
    {
      id: TRAF_LAYER_ID,
      short: "TRAF",
      label: "Traffic pulse",
      group: "infra",
    },
    ...gis,
  ];
}

export type AirTrack = {
  id: string;
  callsign: string;
  kind: "helo" | "fixed" | string;
  agency: string;
  status: string;
  x: number;
  y: number;
  altFt: number;
  note: string;
};

export type TrafficSeg = {
  id: string;
  label: string;
  level: "light" | "mod" | "heavy" | "event" | string;
  d: string;
};

export async function loadAirTracks(signal?: AbortSignal): Promise<AirTrack[]> {
  const res = await fetch(`${BASE}/air-tracks.json`, { signal });
  if (!res.ok) return [];
  const j = (await res.json()) as { tracks: AirTrack[] };
  return j.tracks ?? [];
}

export async function loadTrafficPulse(signal?: AbortSignal): Promise<TrafficSeg[]> {
  const res = await fetch(`${BASE}/traffic-pulse.json`, { signal });
  if (!res.ok) return [];
  const j = (await res.json()) as { segments: TrafficSeg[] };
  return j.segments ?? [];
}

/** Load full Miami pack (all layers projected; visibility is UI-side). */
export async function loadMiamiBasemap(signal?: AbortSignal): Promise<{
  manifest: MiamiManifest;
  layers: ProjectedLayer[];
  layerById: Record<string, ProjectedLayer>;
}> {
  const manRes = await fetch(`${BASE}/manifest.json`, { signal });
  if (!manRes.ok) throw new Error(`miami basemap manifest ${manRes.status}`);
  const manifest = (await manRes.json()) as MiamiManifest;
  const box = paddedBBox(manifest.bbox, manifest.viewPad ?? 0.04);

  const specs = [...manifest.layers].sort((a, b) => a.z - b.z);
  const layers: ProjectedLayer[] = [];

  await Promise.all(
    specs.map(async (spec) => {
      const res = await fetch(`${BASE}/${spec.file}`, { signal });
      if (!res.ok) return;
      const fc = (await res.json()) as GeoJsonFC;
      layers.push(
        projectFeatureCollection(spec.id, spec.kind, fc, box, spec.labelProp)
      );
    })
  );

  layers.sort((a, b) => {
    const za = specs.find((l) => l.id === a.id)?.z ?? 0;
    const zb = specs.find((l) => l.id === b.id)?.z ?? 0;
    return za - zb;
  });

  const layerById: Record<string, ProjectedLayer> = {};
  for (const l of layers) layerById[l.id] = l;

  return { manifest, layers, layerById };
}
