/**
 * Carded CAD sheet for selected CFS — instrument tabs, not a free-form form pile.
 * Tabs: NATURE · LOCATION · FLAGS · RADIO
 */
import { useEffect, useState } from "react";
import type { Incident, PriorityCode, Unit } from "@sector305/core";
import { RadioCaptionMeter } from "./RadioCaptionMeter";
import { consoleAudio } from "../audio/consoleAudio";

export type CadTab = "nature" | "location" | "flags" | "radio" | "close";

type NatureOpt = { code: string; label: string };
type DispOpt = { code: string; label: string };

type Props = {
  selected: Incident | null;
  units: Unit[];
  radioDraft: string;
  onRadioDraft: (v: string) => void;
  natures: NatureOpt[];
  dispositions?: DispOpt[];
  onCmd: (cmd: import("@sector305/core").PlayerCommand) => void;
  onDispatchTwo: () => void;
  onDispatchOne: () => void;
  onSimAcks: () => void;
  onSimOnScene: () => void;
  onClearGoa: () => void;
  onClearWithDisposition?: (code: string) => void;
};

const TABS: { id: CadTab; label: string; hint: string }[] = [
  { id: "nature", label: "NATURE", hint: "Priority · nature · CFS id" },
  { id: "location", label: "LOCATION", hint: "Display · confidence · verify" },
  { id: "flags", label: "FLAGS", hint: "Hazards · notes" },
  { id: "radio", label: "RADIO", hint: "Caption · dispatch · sim" },
  { id: "close", label: "CLOSE", hint: "Disposition · clear" },
];

const DEFAULT_DISPS: DispOpt[] = [
  { code: "GOA", label: "Gone on arrival" },
  { code: "UTL", label: "Unable to locate" },
  { code: "RPT", label: "Report taken" },
  { code: "ADV", label: "Advised" },
  { code: "ARR", label: "Arrest" },
  { code: "UNF", label: "Unfounded" },
  { code: "CAN", label: "Cancelled" },
];

export function CfsCadSheet(props: Props) {
  const { selected } = props;
  const [tab, setTab] = useState<CadTab>("nature");

  // New CFS selection → land on NATURE sheet (operator habit)
  useEffect(() => {
    if (selected) setTab("nature");
  }, [selected?.id]);

  return (
    <div className="panel cfs-panel instrument-panel cad-sheet">
      <h2>
        <span className="h2-title">CFS · CAD sheet</span>
        <span className="h2-meta mono">
          {selected
            ? `${selected.cfsNumber} · ${selected.priority} · ${selected.status}`
            : "NO SELECTION"}
        </span>
      </h2>

      {!selected ? (
        <div className="cad-empty mono">
          <div className="cad-empty-k">STAND BY</div>
          <p>Select an incident from the queue to open the CAD sheet.</p>
        </div>
      ) : (
        <>
          <div className="cad-mast mono" aria-label="CFS masthead">
            <div className="cad-mast-pri">
              <span className={`pri pri-${selected.priority}`}>{selected.priority}</span>
            </div>
            <div className="cad-mast-main">
              <div className="cad-mast-cfs">{selected.cfsNumber}</div>
              <div className="cad-mast-id">{selected.id}</div>
            </div>
            <div className="cad-mast-side">
              <div className="cad-pill">{selected.status}</div>
              <div className="cad-pill dim">{selected.locationConfidence}</div>
            </div>
          </div>

          <div className="cad-tabs" role="tablist" aria-label="CAD sheet tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`cad-tab ${tab === t.id ? "on" : ""}`}
                title={t.hint}
                onClick={() => {
                  consoleAudio.play("ui");
                  setTab(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="cad-tab-hint mono">{TABS.find((t) => t.id === tab)?.hint}</div>

          <div className="cad-body form-grid" role="tabpanel">
            {tab === "nature" && (
              <>
                <label>
                  Priority
                  <select
                    value={selected.priority}
                    onChange={(e) =>
                      props.onCmd({
                        type: "SetPriority",
                        incidentId: selected.id,
                        priority: e.target.value as PriorityCode,
                      })
                    }
                  >
                    {["P0", "P1", "P2", "P3", "P4", "P5"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nature
                  <select
                    value={selected.natureCode}
                    onChange={(e) => {
                      props.onCmd({
                        type: "SetNature",
                        incidentId: selected.id,
                        natureCode: e.target.value,
                      });
                    }}
                  >
                    {props.natures.map((n) => (
                      <option key={n.code} value={n.code}>
                        {n.code} — {n.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="cad-field-ro mono">
                  <span className="cad-field-k">NATURE TEXT</span>
                  <span className="cad-field-v">{selected.natureText}</span>
                </div>
                <div className="cad-field-ro mono">
                  <span className="cad-field-k">ASSIGNED</span>
                  <span className="cad-field-v">
                    {selected.assignedUnitIds?.length
                      ? selected.assignedUnitIds.join(", ")
                      : "—"}
                  </span>
                </div>
              </>
            )}

            {tab === "location" && (
              <>
                <label>
                  Location (display)
                  <input readOnly value={selected.location.freeform} />
                </label>
                <div className="cad-loc-grid mono">
                  <div>
                    <span className="cad-field-k">BLOCK</span>
                    <span className="cad-field-v">{selected.location.block ?? "—"}</span>
                  </div>
                  <div>
                    <span className="cad-field-k">STREET</span>
                    <span className="cad-field-v">{selected.location.street ?? "—"}</span>
                  </div>
                  <div>
                    <span className="cad-field-k">ZONE</span>
                    <span className="cad-field-v">{selected.location.zoneId ?? "—"}</span>
                  </div>
                  <div>
                    <span className="cad-field-k">CONF</span>
                    <span className={`cad-field-v conf-${selected.locationConfidence}`}>
                      {selected.locationConfidence}
                    </span>
                  </div>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      props.onCmd({
                        type: "VerifyLocation",
                        incidentId: selected.id,
                        confidence: "verified",
                        location: {
                          freeform: "1400 block Ocean Drive",
                          block: "1400",
                          street: "Ocean Drive",
                          zoneId: "Z-OCEAN",
                        },
                      })
                    }
                  >
                    Verify → 1400 Ocean
                  </button>
                </div>
                <p className="cad-footnote mono">
                  Hidden truth is grader-only. Display never shows truth pins.
                </p>
              </>
            )}

            {tab === "flags" && (
              <>
                <div className="cad-flag-row">
                  <button
                    type="button"
                    className={selected.flags.includes("WEAPONS") ? "on" : ""}
                    onClick={() =>
                      props.onCmd({
                        type: "SetFlag",
                        incidentId: selected.id,
                        flag: "WEAPONS",
                        value: true,
                      })
                    }
                  >
                    WEAPONS
                  </button>
                  <button
                    type="button"
                    className={selected.flags.includes("NEEDS_BACKUP") ? "on" : ""}
                    onClick={() =>
                      props.onCmd({
                        type: "SetFlag",
                        incidentId: selected.id,
                        flag: "NEEDS_BACKUP",
                        value: true,
                      })
                    }
                  >
                    NEEDS BACKUP
                  </button>
                </div>
                <div className="cad-field-ro mono">
                  <span className="cad-field-k">ACTIVE FLAGS</span>
                  <span className="cad-field-v">
                    {selected.flags.length ? selected.flags.join(" · ") : "NONE"}
                  </span>
                </div>
                <h3 className="cad-subh">CAD notes</h3>
                <div className="radio-log cad-notes">
                  {selected.notes.length === 0 && (
                    <div className="radio-line">No notes</div>
                  )}
                  {selected.notes.map((n, i) => (
                    <div key={i} className="radio-line">
                      +{(n.atMs / 1000).toFixed(1)}s [{n.author}] {n.text}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "radio" && (
              <>
                <label>
                  Dispatch radio caption
                  <textarea
                    rows={4}
                    value={props.radioDraft}
                    onChange={(e) => props.onRadioDraft(e.target.value)}
                  />
                </label>
                <RadioCaptionMeter caption={props.radioDraft} />
                <div className="actions cad-radio-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => props.onDispatchTwo()}
                  >
                    Dispatch 2× AVL patrol
                  </button>
                  <button type="button" onClick={() => props.onDispatchOne()}>
                    Dispatch 1× (risk)
                  </button>
                  <button type="button" onClick={() => props.onSimAcks()}>
                    Sim unit ACKs
                  </button>
                  <button type="button" onClick={() => props.onSimOnScene()}>
                    Sim on scene
                  </button>
                  <button type="button" onClick={() => props.onClearGoa()}>
                    Clear GOA
                  </button>
                </div>
                <p className="cad-footnote mono">
                  Captions are the training surface. Audio is a view over structured events.
                </p>
              </>
            )}

            {tab === "close" && (
              <>
                <h3 className="cad-subh">Disposition · close CFS</h3>
                <p className="cad-footnote">
                  Clearing without a disposition is a graded failure. Units should
                  CLR → AVL before or as you close.
                </p>
                <div className="cad-disp-grid">
                  {(props.dispositions ?? DEFAULT_DISPS).map((d) => (
                    <button
                      key={d.code}
                      type="button"
                      className="cad-disp-btn"
                      disabled={
                        selected.status === "CLEARED" ||
                        selected.status === "CANCELLED"
                      }
                      onClick={() => {
                        consoleAudio.play("clear");
                        if (props.onClearWithDisposition) {
                          props.onClearWithDisposition(d.code);
                        } else {
                          props.onCmd({
                            type: "ClearIncident",
                            incidentId: selected.id,
                            disposition: d.code,
                          });
                        }
                      }}
                    >
                      <span className="mono">{d.code}</span>
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
                <div className="actions cad-radio-actions">
                  <button type="button" onClick={() => props.onClearGoa()}>
                    Quick clear GOA
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="cad-sheet-foot mono">
            <span>SHEET {tab.toUpperCase()}</span>
            <span>·</span>
            <span>{selected.natureCode}</span>
            <span>·</span>
            <span>{selected.location.zoneId ?? "NO ZONE"}</span>
          </div>
        </>
      )}
    </div>
  );
}
