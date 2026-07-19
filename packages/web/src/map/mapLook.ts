/** Sector plate look presets + persisted workspace prefs. */

export type MapThemeId =
  | "cyan"
  | "amber"
  | "phosphor"
  | "miami"
  | "slate"
  | "alert";

export type MapMode = "docked" | "float" | "max";

export type MapLook = {
  theme: MapThemeId;
  /** 0.3–1.6 GIS road / line strength */
  roadGain: number;
  /** 0.3–1.6 poly fill strength */
  fillGain: number;
  /** 0.5–1.5 label / chrome brightness */
  labelGain: number;
  /** overall plate brightness 0.6–1.3 */
  brightness: number;
};

export type MapWorkspacePrefs = {
  mode: MapMode;
  /** Docked column flex / min width px */
  dockWidth: number;
  float: { x: number; y: number; w: number; h: number };
  look: MapLook;
  lookOpen: boolean;
};

export const MAP_THEMES: Record<
  MapThemeId,
  { label: string; short: string; accent: string; road: string; fill: string; hot: string }
> = {
  cyan: {
    label: "Cyan night",
    short: "CYAN",
    accent: "56, 190, 235",
    road: "90, 150, 180",
    fill: "30, 55, 78",
    hot: "255, 179, 30",
  },
  amber: {
    label: "Amber CRT",
    short: "AMBR",
    accent: "255, 179, 30",
    road: "200, 140, 40",
    fill: "70, 45, 15",
    hot: "255, 100, 40",
  },
  phosphor: {
    label: "Green phosphor",
    short: "PHOS",
    accent: "54, 204, 110",
    road: "40, 160, 90",
    fill: "15, 50, 30",
    hot: "180, 255, 120",
  },
  miami: {
    label: "Miami neon",
    short: "MIA",
    accent: "255, 45, 123",
    road: "56, 190, 235",
    fill: "40, 20, 50",
    hot: "255, 200, 40",
  },
  slate: {
    label: "Slate mono",
    short: "SLATE",
    accent: "180, 190, 200",
    road: "120, 130, 140",
    fill: "40, 45, 52",
    hot: "230, 230, 235",
  },
  alert: {
    label: "Alert red",
    short: "ALRT",
    accent: "255, 59, 48",
    road: "180, 70, 60",
    fill: "55, 20, 22",
    hot: "255, 179, 30",
  },
};

export const DEFAULT_LOOK: MapLook = {
  theme: "cyan",
  roadGain: 1,
  fillGain: 1,
  labelGain: 1,
  brightness: 1,
};

export const DEFAULT_WORKSPACE: MapWorkspacePrefs = {
  mode: "docked",
  dockWidth: 380,
  float: { x: 80, y: 72, w: 720, h: 520 },
  look: DEFAULT_LOOK,
  lookOpen: false,
};

const KEY = "s305.map.workspace";

export function loadMapWorkspace(): MapWorkspacePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_WORKSPACE, look: { ...DEFAULT_LOOK } };
    const j = JSON.parse(raw) as Partial<MapWorkspacePrefs>;
    return {
      ...DEFAULT_WORKSPACE,
      ...j,
      look: { ...DEFAULT_LOOK, ...(j.look ?? {}) },
      float: { ...DEFAULT_WORKSPACE.float, ...(j.float ?? {}) },
    };
  } catch {
    return { ...DEFAULT_WORKSPACE, look: { ...DEFAULT_LOOK } };
  }
}

export function saveMapWorkspace(p: MapWorkspacePrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** CSS custom props for plate theming. */
export function lookToCssVars(look: MapLook): Record<string, string> {
  const t = MAP_THEMES[look.theme] ?? MAP_THEMES.cyan;
  return {
    "--map-accent-rgb": t.accent,
    "--map-road-rgb": t.road,
    "--map-fill-rgb": t.fill,
    "--map-hot-rgb": t.hot,
    "--map-road-gain": String(look.roadGain),
    "--map-fill-gain": String(look.fillGain),
    "--map-label-gain": String(look.labelGain),
    "--map-brightness": String(look.brightness),
  };
}
