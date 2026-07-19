import { useState, type ReactNode } from "react";
import type { Incident, Unit } from "@sector305/core";
import { ApparatusStrip, type FireToneEvent } from "./ApparatusStrip";
import { EmsRescuePanel } from "./EmsRescuePanel";
import { SpecialUsePanel } from "./SpecialUsePanel";
import { consoleAudio } from "../audio/consoleAudio";

export type AgencyTab = "pd" | "fd" | "ems" | "spec";

type Props = {
  units: Unit[];
  incidents: Record<string, Incident>;
  selectedUnitId: string | null;
  onSelectUnit: (id: string | null) => void;
  clockMs: number;
  selectedCfsLabel?: string | null;
  onFireToneOut?: (ev: FireToneEvent) => void;
  fireLog?: FireToneEvent[];
  /** Extra block under PD list (timers, readbacks). */
  pdFooter?: ReactNode;
};

const TABS: Array<{
  id: AgencyTab;
  k: string;
  s: string;
  cls: string;
}> = [
  { id: "pd", k: "PD", s: "UNITS", cls: "pd" },
  { id: "fd", k: "FD", s: "FIRE", cls: "fd" },
  { id: "ems", k: "EMS", s: "RESCUE", cls: "ems" },
  { id: "spec", k: "SPEC", s: "SPECIAL", cls: "spec" },
];

/** Multi-agency desk: PD / FD / EMS / SPECIAL USE. */
export function AgencyDesk({
  units,
  incidents,
  selectedUnitId,
  onSelectUnit,
  clockMs,
  selectedCfsLabel,
  onFireToneOut,
  fireLog = [],
  pdFooter,
}: Props) {
  const [tab, setTab] = useState<AgencyTab>("pd");

  const pdAvl = units.filter((u) => u.status === "AVL").length;

  return (
    <div className={`agency-desk tab-${tab}`}>
      <div className="agency-tabs tabs-4" role="tablist" aria-label="Agency desk">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`agency-tab ${t.cls} ${tab === t.id ? "on" : ""}`}
            onClick={() => {
              setTab(t.id);
              consoleAudio.play("ui");
            }}
          >
            <span className="agency-tab-k">{t.k}</span>
            <span className="agency-tab-s mono">
              {t.id === "pd" ? `${pdAvl}/${units.length}` : t.s}
            </span>
          </button>
        ))}
      </div>

      <div className="agency-body" role="tabpanel">
        {tab === "pd" && (
          <div className="agency-pd">
            <div className="agency-subhead mono">
              POLICE · UNIT BOARD · LAST-KNOWN
            </div>
            <div className="agency-pd-list">
              {units.map((u) => (
                <button
                  type="button"
                  key={u.id}
                  className={`unit-row ${selectedUnitId === u.id ? "active" : ""}`}
                  aria-pressed={selectedUnitId === u.id}
                  onClick={() =>
                    onSelectUnit(u.id === selectedUnitId ? null : u.id)
                  }
                >
                  <span>{u.callsign}</span>
                  <span className={`st-${u.status}`}>{u.status}</span>
                  <span className="unit-row-meta">
                    {u.assignedIncidentId
                      ? incidents[u.assignedIncidentId]?.cfsNumber
                      : u.zoneId}
                  </span>
                </button>
              ))}
            </div>
            {pdFooter}
          </div>
        )}

        {tab === "fd" && (
          <div className="agency-fd">
            <ApparatusStrip clockMs={clockMs} onToneOut={onFireToneOut} />
            {fireLog.length > 0 && (
              <div className="fire-tone-log mono">
                {fireLog.slice(0, 4).map((f, i) => (
                  <div key={`${f.atMs}-${f.unit}-${i}`}>
                    +{(f.atMs / 1000).toFixed(0)}s {f.stationId} · {f.unit}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "ems" && (
          <div className="agency-ems">
            <EmsRescuePanel
              clockMs={clockMs}
              selectedCfsLabel={selectedCfsLabel}
              compact
            />
          </div>
        )}

        {tab === "spec" && (
          <div className="agency-spec">
            <SpecialUsePanel
              clockMs={clockMs}
              selectedCfsLabel={selectedCfsLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
