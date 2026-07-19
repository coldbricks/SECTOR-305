import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  DEFAULT_WORKSPACE,
  MAP_THEMES,
  loadMapWorkspace,
  lookToCssVars,
  saveMapWorkspace,
  type MapLook,
  type MapMode,
  type MapThemeId,
  type MapWorkspacePrefs,
} from "../map/mapLook";
import { consoleAudio } from "../audio/consoleAudio";

type Props = {
  children: ReactNode;
  /** Called when docked width changes so parent grid can react. */
  onDockWidth?: (px: number) => void;
};

export function MapWorkspace({ children, onDockWidth }: Props) {
  const [prefs, setPrefs] = useState<MapWorkspacePrefs>(() => loadMapWorkspace());
  const drag = useRef<null | {
    kind: "move" | "resize-se" | "resize-e" | "resize-s";
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  }>(null);

  const persist = useCallback((next: MapWorkspacePrefs) => {
    setPrefs(next);
    saveMapWorkspace(next);
    onDockWidth?.(next.dockWidth);
  }, [onDockWidth]);

  useEffect(() => {
    onDockWidth?.(prefs.dockWidth);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(partial: Partial<MapWorkspacePrefs>) {
    persist({ ...prefs, ...partial });
  }

  function patchLook(partial: Partial<MapLook>) {
    persist({ ...prefs, look: { ...prefs.look, ...partial } });
  }

  function setMode(mode: MapMode) {
    consoleAudio.play("ui");
    patch({ mode });
  }

  function onChromePointerDown(
    kind: "move" | "resize-se" | "resize-e" | "resize-s",
    e: ReactPointerEvent
  ) {
    if (prefs.mode === "docked" && kind === "move") return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const f = prefs.float;
    drag.current = {
      kind,
      sx: e.clientX,
      sy: e.clientY,
      ox: f.x,
      oy: f.y,
      ow: prefs.mode === "docked" ? prefs.dockWidth : f.w,
      oh: f.h,
    };
  }

  function onChromePointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (prefs.mode === "docked" && d.kind === "resize-e") {
      const w = Math.min(900, Math.max(260, d.ow + dx));
      patch({ dockWidth: w });
      return;
    }
    if (prefs.mode === "max") return;
    if (d.kind === "move") {
      patch({
        float: {
          ...prefs.float,
          x: Math.max(0, d.ox + dx),
          y: Math.max(0, d.oy + dy),
        },
      });
    } else if (d.kind === "resize-se") {
      patch({
        float: {
          ...prefs.float,
          w: Math.min(window.innerWidth - 40, Math.max(360, d.ow + dx)),
          h: Math.min(window.innerHeight - 40, Math.max(280, d.oh + dy)),
        },
      });
    } else if (d.kind === "resize-e") {
      patch({
        float: {
          ...prefs.float,
          w: Math.min(window.innerWidth - 40, Math.max(360, d.ow + dx)),
        },
      });
    } else if (d.kind === "resize-s") {
      patch({
        float: {
          ...prefs.float,
          h: Math.min(window.innerHeight - 40, Math.max(280, d.oh + dy)),
        },
      });
    }
  }

  function onChromePointerUp(e: ReactPointerEvent) {
    if (!drag.current) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  const theme = MAP_THEMES[prefs.look.theme];
  const cssVars = lookToCssVars(prefs.look) as CSSProperties;

  const style: CSSProperties =
    prefs.mode === "docked"
      ? {
          ...cssVars,
          ["--map-dock-w" as string]: `${prefs.dockWidth}px`,
        }
      : prefs.mode === "max"
        ? {
            ...cssVars,
            top: 8,
            left: 8,
            width: "calc(100vw - 16px)",
            height: "calc(100vh - 16px)",
          }
        : {
            ...cssVars,
            top: prefs.float.y,
            left: prefs.float.x,
            width: prefs.float.w,
            height: prefs.float.h,
          };

  const floating = prefs.mode === "float" || prefs.mode === "max";

  const shell = (
      <div
        className={`map-workspace mode-${prefs.mode} ${prefs.lookOpen ? "look-open" : ""}`}
        data-map-theme={prefs.look.theme}
        style={style}
      >
        <div
          className="mw-toolbar"
          onPointerMove={onChromePointerMove}
          onPointerUp={onChromePointerUp}
          onPointerCancel={onChromePointerUp}
        >
          {floating && (
            <button
              type="button"
              className="mw-grip"
              title="Drag window"
              onPointerDown={(e) => onChromePointerDown("move", e)}
            >
              ⋮⋮
            </button>
          )}
          <span className="mw-title mono">PLATE · {theme.short}</span>

          <div className="mw-tools">
            <button
              type="button"
              className={prefs.lookOpen ? "on" : ""}
              title="Look · colors"
              onClick={() => {
                consoleAudio.play("ui");
                patch({ lookOpen: !prefs.lookOpen });
              }}
            >
              LOOK
            </button>
            <button
              type="button"
              title="Smaller"
              disabled={prefs.mode !== "docked" && prefs.mode !== "float"}
              onClick={() => {
                consoleAudio.play("ui");
                if (prefs.mode === "docked") {
                  patch({ dockWidth: Math.max(260, prefs.dockWidth - 40) });
                } else {
                  patch({
                    float: {
                      ...prefs.float,
                      w: Math.max(360, prefs.float.w - 48),
                      h: Math.max(280, prefs.float.h - 36),
                    },
                  });
                }
              }}
            >
              −
            </button>
            <button
              type="button"
              title="Larger"
              disabled={prefs.mode !== "docked" && prefs.mode !== "float"}
              onClick={() => {
                consoleAudio.play("ui");
                if (prefs.mode === "docked") {
                  patch({ dockWidth: Math.min(900, prefs.dockWidth + 40) });
                } else {
                  patch({
                    float: {
                      ...prefs.float,
                      w: Math.min(window.innerWidth - 24, prefs.float.w + 48),
                      h: Math.min(window.innerHeight - 24, prefs.float.h + 36),
                    },
                  });
                }
              }}
            >
              +
            </button>
            <button
              type="button"
              className={prefs.mode === "float" ? "on" : ""}
              title="Pop out floating plate"
              onClick={() => setMode(prefs.mode === "float" ? "docked" : "float")}
            >
              POP
            </button>
            <button
              type="button"
              className={prefs.mode === "max" ? "on" : ""}
              title="Maximize plate"
              onClick={() => setMode(prefs.mode === "max" ? "docked" : "max")}
            >
              MAX
            </button>
            {floating && (
              <button type="button" title="Dock back" onClick={() => setMode("docked")}>
                DOCK
              </button>
            )}
          </div>
        </div>

        {prefs.lookOpen && (
          <div className="mw-look" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mw-look-row">
              <span className="mw-look-k">THEME</span>
              <div className="mw-theme-pills">
                {(Object.keys(MAP_THEMES) as MapThemeId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`mw-pill theme-${id} ${prefs.look.theme === id ? "on" : ""}`}
                    title={MAP_THEMES[id].label}
                    onClick={() => {
                      consoleAudio.play("ui");
                      patchLook({ theme: id });
                    }}
                  >
                    {MAP_THEMES[id].short}
                  </button>
                ))}
              </div>
            </div>
            {(
              [
                ["roadGain", "ROADS", 0.3, 1.6, 0.05],
                ["fillGain", "FILLS", 0.3, 1.6, 0.05],
                ["labelGain", "LABELS", 0.5, 1.5, 0.05],
                ["brightness", "GLOW", 0.6, 1.3, 0.05],
              ] as const
            ).map(([key, label, min, max, step]) => (
              <label key={key} className="mw-slider">
                <span className="mw-look-k">
                  {label}
                  <span className="mono">{prefs.look[key].toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={prefs.look[key]}
                  onChange={(e) =>
                    patchLook({ [key]: Number(e.target.value) } as Partial<MapLook>)
                  }
                />
              </label>
            ))}
            <div className="mw-look-actions">
              <button
                type="button"
                onClick={() => {
                  consoleAudio.play("ui");
                  patchLook({ ...DEFAULT_WORKSPACE.look });
                }}
              >
                RESET LOOK
              </button>
            </div>
          </div>
        )}

        <div className="mw-body">{children}</div>

        {/* Resize handles */}
        {prefs.mode === "float" && (
          <>
            <div
              className="mw-handle se"
              onPointerDown={(e) => onChromePointerDown("resize-se", e)}
              onPointerMove={onChromePointerMove}
              onPointerUp={onChromePointerUp}
            />
            <div
              className="mw-handle e"
              onPointerDown={(e) => onChromePointerDown("resize-e", e)}
              onPointerMove={onChromePointerMove}
              onPointerUp={onChromePointerUp}
            />
            <div
              className="mw-handle s"
              onPointerDown={(e) => onChromePointerDown("resize-s", e)}
              onPointerMove={onChromePointerMove}
              onPointerUp={onChromePointerUp}
            />
          </>
        )}
        {prefs.mode === "docked" && (
          <div
            className="mw-handle e dock"
            title="Drag to resize plate width"
            onPointerDown={(e) => onChromePointerDown("resize-e", e)}
            onPointerMove={onChromePointerMove}
            onPointerUp={onChromePointerUp}
          />
        )}
      </div>
  );

  return (
    <>
      {floating && (
        <>
          <div
            className="map-ws-backdrop"
            onClick={() => setMode("docked")}
            aria-hidden
          />
          <button
            type="button"
            className="map-ws-placeholder"
            onClick={() => setMode("docked")}
            title="Plate is popped out — click to dock"
          >
            <span className="mono">SECTOR PLATE · POPPED OUT</span>
            <span className="dim">CLICK TO DOCK · OR USE DOCK ON WINDOW</span>
          </button>
        </>
      )}
      {shell}
    </>
  );
}
