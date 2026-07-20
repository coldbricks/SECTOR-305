/**
 * Unit status change modal — AVL → DIS → ER → OS (LEGAL_NEXT edges only).
 * Fiction CAD chrome; not a production Motorola clone.
 */
import { LEGAL_NEXT, type Unit, type UnitStatus } from "@sector305/core";
import { consoleAudio } from "../audio/consoleAudio";

type Props = {
  unit: Unit | null;
  open: boolean;
  onClose: () => void;
  onSetStatus: (unitId: string, status: UnitStatus) => void;
  cfsHint?: string | null;
};

const STATUS_HELP: Partial<Record<UnitStatus, string>> = {
  AVL: "Available",
  DIS: "Dispatched",
  ER: "En route",
  OS: "On scene",
  CLR: "Clearing",
  OOS: "Out of service",
  BSI: "Busy / special",
  EMR: "Emergency",
};

export function UnitStatusModal({
  unit,
  open,
  onClose,
  onSetStatus,
  cfsHint,
}: Props) {
  if (!open || !unit) return null;
  const next = LEGAL_NEXT[unit.status] ?? [];

  return (
    <div
      className="unit-status-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="unit-status-modal"
        role="dialog"
        aria-label="Change unit status"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="usm-head mono">
          <div>
            <div className="usm-kicker">UNIT STATUS</div>
            <strong>{unit.callsign}</strong>
            <span className={`usm-cur st-${unit.status}`}>{unit.status}</span>
          </div>
          <button type="button" className="usm-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {cfsHint ? (
          <div className="usm-cfs mono">CFS · {cfsHint}</div>
        ) : null}
        <p className="usm-hint">
          Legal next only — illegal skips (e.g. AVL→OS) are graded, not offered.
        </p>
        <div className="usm-grid">
          {next.map((st) => (
            <button
              key={st}
              type="button"
              className={`usm-btn st-${st}`}
              onClick={() => {
                onSetStatus(unit.id, st);
                consoleAudio.play("ack");
                onClose();
              }}
            >
              <span className="usm-code mono">{st}</span>
              <span className="usm-label">{STATUS_HELP[st] ?? st}</span>
            </button>
          ))}
          {next.length === 0 ? (
            <div className="usm-empty mono">No legal transitions from {unit.status}</div>
          ) : null}
        </div>
        <footer className="usm-foot mono">TRAINING · FICTION STATUS GRAPH</footer>
      </div>
    </div>
  );
}
