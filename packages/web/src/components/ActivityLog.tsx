/**
 * Radio activity log — modern console columns (AXS-inspired, original chrome).
 * Time · Resource · Unit · Event
 */
import type { RadioEvent } from "@sector305/core";

type Props = {
  events: RadioEvent[];
  /** Selected watch resource alpha / channel label */
  resourceLabel?: string;
  watchMeta?: string | null;
  maxRows?: number;
};

function fmtTime(atMs: number): string {
  const s = Math.max(0, atMs) / 1000;
  if (s < 60) return `+${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `+${m}:${rem.toFixed(0).padStart(2, "0")}`;
}

function unitCell(r: RadioEvent): string {
  if (r.unitId) return r.unitId;
  if (r.direction === "unit_tx" || r.kind === "ACK" || r.kind === "STATUS") {
    return r.from;
  }
  if (r.to && r.to !== "ALL") return r.to;
  return r.from;
}

function eventCell(r: RadioEvent): string {
  let cap = r.caption;
  if (r.requiresReadback && !r.readbackSatisfiedAtMs) {
    cap = `${cap} ⚠ READBACK`;
  } else if (r.readbackSatisfiedAtMs) {
    cap = `${cap} · ACK`;
  }
  if (r.steppedOn) cap = `⚡ ${cap}`;
  if (r.incomplete) cap = `${cap} [INC]`;
  return cap;
}

function dirClass(r: RadioEvent): string {
  if (r.direction === "unit_tx") return "dir-unit";
  if (r.direction === "system") return "dir-system";
  if (r.kind === "EMERGENCY" || r.kind === "BOLO") return "dir-emr";
  return "dir-dispatch";
}

export function ActivityLog(props: Props) {
  const max = props.maxRows ?? 48;
  // Newest first for console scan habit
  const rows = [...props.events].slice(-max).reverse();

  return (
    <div className="activity-log" role="region" aria-label="Radio activity log">
      <div className="al-head">
        <h2>
          <span className="h2-title">Activity log</span>
          <span className="h2-meta mono">
            {props.resourceLabel ? props.resourceLabel : "NO RESOURCE"}
          </span>
        </h2>
        {props.watchMeta ? (
          <div className="watch-ch mono">{props.watchMeta}</div>
        ) : null}
      </div>

      <div className="al-cols mono" aria-hidden>
        <span className="al-c-time">TIME</span>
        <span className="al-c-res">RESOURCE</span>
        <span className="al-c-unit">UNIT</span>
        <span className="al-c-evt">EVENT</span>
      </div>

      <div className="al-body">
        {rows.length === 0 && (
          <div className="al-row al-quiet mono">
            <span className="al-c-time">—</span>
            <span className="al-c-res">—</span>
            <span className="al-c-unit">—</span>
            <span className="al-c-evt">Channel quiet</span>
          </div>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className={`al-row ${dirClass(r)} ${r.requiresReadback && !r.readbackSatisfiedAtMs ? "needs-rb" : ""}`}
          >
            <span className="al-c-time mono">{fmtTime(r.atMs)}</span>
            <span className="al-c-res mono" title={r.channelId}>
              {r.channelId}
            </span>
            <span
              className="al-c-unit mono"
              title={`${r.from} → ${r.to ?? "ALL"}`}
            >
              {unitCell(r)}
            </span>
            <span className="al-c-evt">
              <span className="al-kind mono">[{r.kind}]</span>{" "}
              <span className="cap">{eventCell(r)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
