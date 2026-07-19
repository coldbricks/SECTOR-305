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
  DOCK_H_MAX,
  DOCK_H_MIN,
  DOCK_W_MAX,
  DOCK_W_MIN,
  MAP_THEMES,
  clampDockH,
  clampDockW,
  loadMapWorkspace,
  lookToCssVars,
  saveMapWorkspace,
  type MapLook,
  type MapMode,
  type MapThemeId,
  type MapWorkspacePrefs,
} from "../map/mapLook";
import { consoleAudio } from "../audio/consoleAudio";

export type DockSize = { width: number; height: number | null };

type Props = {
  children: ReactNode;
  /** Docked plate outer window size for parent grid cell. */
  onDockSize?: (size: DockSize) => void;
  /** @deprecated use onDockSize */
  onDockWidth?: (px: number) => void;
};

type DragKind = "move" | "resize-se" | "resize-e" | "resize-s";

type DragState = {
  kind: DragKind;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
  mode: MapMode;
};

export function MapWorkspace({ children, onDockSize, onDockWidth }: Props) {
  const [prefs, setPrefs] = useState<MapWorkspacePrefs>(() => loadMapWorkspace());
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const emitDock = useCallback(
    (p: MapWorkspacePrefs) => {
      onDockWidth?.(p.dockWidth);
      onDockSize?.({ width: p.dockWidth, height: p.dockHeight });
    },
    [onDockSize, onDockWidth]
  );

  const commit = useCallback(
    (partial: Partial<MapWorkspacePrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...partial };
        // nested float merge when only float fields patch
        if (partial.float) {
          next.float = { ...prev.float, ...partial.float };
        }
        if (partial.look) {
          next.look = { ...prev.look, ...partial.look };
        }
        saveMapWorkspace(next);
        // defer parent notify so React can paint shell first
        queueMicrotask(() => emitDock(next));
        return next;
      });
    },
    [emitDock]
  );

  useEffect(() => {
    emitDock(prefsRef.current);
  }, [emitDock]);

  function setMode(mode: MapMode) {
    consoleAudio.play("ui");
    commit({ mode });
  }

  function patchLook(partial: Partial<MapLook>) {
    commit({ look: { ...prefsRef.current.look, ...partial } });
  }

  function currentDockHeight(): number {
    const p = prefsRef.current;
    if (p.dockHeight != null) return p.dockHeight;
    const el = shellRef.current;
    if (el) {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 40) return h;
    }
    return 480;
  }

  function endDrag() {
    dragRef.current = null;
  }

  function onDragPointerMove(ev: PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = ev.clientX - d.sx;
    const dy = ev.clientY - d.sy;

    if (d.mode === "docked") {
      if (d.kind === "resize-e") {
        commit({ dockWidth: clampDockW(d.ow + dx) });
        return;
      }
      if (d.kind === "resize-s") {
        commit({ dockHeight: clampDockH(d.oh + dy) });
        return;
      }
      if (d.kind === "resize-se") {
        commit({
          dockWidth: clampDockW(d.ow + dx),
          dockHeight: clampDockH(d.oh + dy),
        });
        return;
      }
      return;
    }

    if (d.mode === "max") return;

    if (d.kind === "move") {
      commit({
        float: {
          ...prefsRef.current.float,
          x: Math.max(0, d.ox + dx),
          y: Math.max(0, d.oy + dy),
        },
      });
    } else if (d.kind === "resize-se") {
      commit({
        float: {
          ...prefsRef.current.float,
          w: Math.min(window.innerWidth - 40, Math.max(360, d.ow + dx)),
          h: Math.min(window.innerHeight - 40, Math.max(280, d.oh + dy)),
        },
      });
    } else if (d.kind === "resize-e") {
      commit({
        float: {
          ...prefsRef.current.float,
          w: Math.min(window.innerWidth - 40, Math.max(360, d.ow + dx)),
        },
      });
    } else if (d.kind === "resize-s") {
      commit({
        float: {
          ...prefsRef.current.float,
          h: Math.min(window.innerHeight - 40, Math.max(280, d.oh + dy)),
        },
      });
    }
  }

  function onDragPointerUp() {
    endDrag();
    window.removeEventListener("pointermove", onDragPointerMove);
    window.removeEventListener("pointerup", onDragPointerUp);
    window.removeEventListener("pointercancel", onDragPointerUp);
  }

  function beginDrag(kind: DragKind, e: ReactPointerEvent) {
    const mode = prefsRef.current.mode;
    if (mode === "docked" && kind === "move") return;
    if (mode === "max" && kind !== "move") return;

    e.preventDefault();
    e.stopPropagation();

    const f = prefsRef.current.float;
    dragRef.current = {
      kind,
      sx: e.clientX,
      sy: e.clientY,
      ox: f.x,
      oy: f.y,
      ow: mode === "docked" ? prefsRef.current.dockWidth : f.w,
      oh: mode === "docked" ? currentDockHeight() : f.h,
      mode,
    };

    window.addEventListener("pointermove", onDragPointerMove);
    window.addEventListener("pointerup", onDragPointerUp);
    window.addEventListener("pointercancel", onDragPointerUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onDragPointerMove);
      window.removeEventListener("pointerup", onDragPointerUp);
      window.removeEventListener("pointercancel", onDragPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetDockSize() {
    consoleAudio.play("ui");
    commit({
      dockWidth: DEFAULT_WORKSPACE.dockWidth,
      dockHeight: null,
    });
  }

  const theme = MAP_THEMES[prefs.look.theme];
  const cssVars = lookToCssVars(prefs.look) as CSSProperties;
  const customH = prefs.mode === "docked" && prefs.dockHeight != null;

  // Docked: explicit W×H on the workspace *is* the window chrome.
  // Parent .map-panel mirrors the same numbers so the grid cell matches.
  const style: CSSProperties =
    prefs.mode === "docked"
      ? {
          ...cssVars,
          width: "100%",
          height: customH ? prefs.dockHeight! : "100%",
          minHeight: customH ? prefs.dockHeight! : 0,
          maxHeight: customH ? prefs.dockHeight! : undefined,
          boxSizing: "border-box",
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
  const dimLabel =
    prefs.mode === "docked"
      ? `${prefs.dockWidth}×${prefs.dockHeight ?? "auto"}`
      : prefs.mode === "float"
        ? `${prefs.float.w}×${prefs.float.h}`
        : "MAX";

  const shell = (
    <div
      ref={shellRef}
      className={`map-workspace mode-${prefs.mode} ${prefs.lookOpen ? "look-open" : ""} ${
        customH ? "dock-custom-h" : ""
      }`}
      data-map-theme={prefs.look.theme}
      style={style}
    >
      <div className="mw-toolbar">
        {floating && (
          <button
            type="button"
            className="mw-grip"
            title="Drag window"
            onPointerDown={(e) => beginDrag("move", e)}
          >
            ⋮⋮
          </button>
        )}
        <span className="mw-title mono">PLATE · {theme.short}</span>
        <span className="mw-dims mono" title="Outer window size (persists)">
          {dimLabel}
        </span>

        <div className="mw-tools">
          <button
            type="button"
            className={prefs.lookOpen ? "on" : ""}
            title="Look · colors"
            onClick={() => {
              consoleAudio.play("ui");
              commit({ lookOpen: !prefs.lookOpen });
            }}
          >
            LOOK
          </button>
          <button
            type="button"
            title="Smaller window"
            disabled={prefs.mode === "max"}
            onClick={() => {
              consoleAudio.play("ui");
              if (prefs.mode === "docked") {
                const h = prefs.dockHeight ?? currentDockHeight();
                commit({
                  dockWidth: clampDockW(prefs.dockWidth - 40),
                  dockHeight: clampDockH(h - 36),
                });
              } else if (prefs.mode === "float") {
                commit({
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
            title="Larger window"
            disabled={prefs.mode === "max"}
            onClick={() => {
              consoleAudio.play("ui");
              if (prefs.mode === "docked") {
                const h = prefs.dockHeight ?? currentDockHeight();
                commit({
                  dockWidth: clampDockW(prefs.dockWidth + 40),
                  dockHeight: clampDockH(h + 36),
                });
              } else if (prefs.mode === "float") {
                commit({
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
          {prefs.mode === "docked" && (
            <button
              type="button"
              title="Reset: default width, height fills cell"
              onClick={resetDockSize}
            >
              FIT
            </button>
          )}
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
          <div className="mw-look-row mw-size-row">
            <span className="mw-look-k">WINDOW</span>
            <div className="mw-size-fields mono">
              <label>
                W
                <input
                  type="number"
                  min={DOCK_W_MIN}
                  max={DOCK_W_MAX}
                  step={10}
                  value={prefs.dockWidth}
                  onChange={(e) =>
                    commit({ dockWidth: clampDockW(Number(e.target.value) || DOCK_W_MIN) })
                  }
                />
              </label>
              <label>
                H
                <input
                  type="number"
                  min={DOCK_H_MIN}
                  max={DOCK_H_MAX}
                  step={10}
                  placeholder="auto"
                  value={prefs.dockHeight ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      commit({ dockHeight: null });
                      return;
                    }
                    commit({ dockHeight: clampDockH(Number(v) || DOCK_H_MIN) });
                  }}
                />
              </label>
              <button type="button" onClick={resetDockSize}>
                AUTO H
              </button>
            </div>
          </div>
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

      {prefs.mode === "float" && (
        <>
          <div
            className="mw-handle se"
            title="Resize window"
            onPointerDown={(e) => beginDrag("resize-se", e)}
          />
          <div
            className="mw-handle e"
            title="Resize width"
            onPointerDown={(e) => beginDrag("resize-e", e)}
          />
          <div
            className="mw-handle s"
            title="Resize height"
            onPointerDown={(e) => beginDrag("resize-s", e)}
          />
        </>
      )}
      {prefs.mode === "docked" && (
        <>
          <div
            className="mw-handle e dock"
            title="Drag · window width"
            onPointerDown={(e) => beginDrag("resize-e", e)}
          />
          <div
            className="mw-handle s dock"
            title="Drag · pull window height down"
            onPointerDown={(e) => beginDrag("resize-s", e)}
          />
          <div
            className="mw-handle se dock"
            title="Drag · window width + height"
            onPointerDown={(e) => beginDrag("resize-se", e)}
          />
        </>
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
