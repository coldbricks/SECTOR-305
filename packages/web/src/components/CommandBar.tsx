/**
 * Fiction command line — PREMIER-inspired density, original chrome.
 * Examples:
 *   D 3A12 3A14     → DispatchUnits on selected CFS
 *   US 3A12 ER      → SetUnitStatus
 *   C GOA           → ClearIncident disposition GOA
 */
import { useState } from "react";
import type { PlayerCommand, Unit, UnitStatus } from "@sector305/core";
import { UNIT_STATUSES } from "@sector305/core";
import { consoleAudio } from "../audio/consoleAudio";

type Props = {
  selectedIncidentId: string | null;
  units: Unit[];
  radioDraft: string;
  onCmd: (cmd: PlayerCommand) => void;
};

function findUnit(units: Unit[], token: string): Unit | undefined {
  const t = token.toUpperCase();
  return units.find(
    (u) =>
      u.callsign.toUpperCase() === t ||
      u.callsign.toUpperCase().replace(/\s+/g, "") === t ||
      u.id.toUpperCase() === t
  );
}

function isStatus(s: string): s is UnitStatus {
  return (UNIT_STATUSES as string[]).includes(s);
}

export function parseCommandLine(
  line: string,
  ctx: {
    selectedIncidentId: string | null;
    units: Unit[];
    radioDraft: string;
  }
): { ok: true; cmds: PlayerCommand[]; echo: string } | { ok: false; error: string } {
  const raw = line.trim();
  if (!raw) return { ok: false, error: "Empty command" };
  const parts = raw.split(/\s+/);
  const verb = parts[0]!.toUpperCase();

  // D <unit> [unit…]  — dispatch selected CFS
  if (verb === "D" || verb === "DI" || verb === "DISPATCH") {
    if (!ctx.selectedIncidentId) {
      return { ok: false, error: "No CFS selected — select queue row first" };
    }
    const ids: string[] = [];
    for (const tok of parts.slice(1)) {
      const u = findUnit(ctx.units, tok);
      if (!u) return { ok: false, error: `Unknown unit ${tok}` };
      ids.push(u.id);
    }
    if (!ids.length) {
      // default: first AVL
      const avl = ctx.units.find((u) => u.status === "AVL");
      if (!avl) return { ok: false, error: "No AVL unit" };
      ids.push(avl.id);
    }
    return {
      ok: true,
      echo: `DISPATCH ${ids.length} unit(s)`,
      cmds: [
        {
          type: "DispatchUnits",
          incidentId: ctx.selectedIncidentId,
          unitIds: ids,
          radioCaption: ctx.radioDraft || undefined,
        },
      ],
    };
  }

  // US <unit> <status>
  if (verb === "US" || verb === "STATUS") {
    const u = findUnit(ctx.units, parts[1] ?? "");
    const st = (parts[2] ?? "").toUpperCase();
    if (!u) return { ok: false, error: "US needs unit callsign" };
    if (!isStatus(st)) return { ok: false, error: `Bad status ${st}` };
    return {
      ok: true,
      echo: `${u.callsign} → ${st}`,
      cmds: [{ type: "SetUnitStatus", unitId: u.id, status: st }],
    };
  }

  // C <disposition>  — clear selected
  if (verb === "C" || verb === "CL" || verb === "CLEAR") {
    if (!ctx.selectedIncidentId) {
      return { ok: false, error: "No CFS selected" };
    }
    const disp = (parts[1] ?? "GOA").toUpperCase();
    return {
      ok: true,
      echo: `CLEAR ${disp}`,
      cmds: [
        {
          type: "ClearIncident",
          incidentId: ctx.selectedIncidentId,
          disposition: disp,
        },
      ],
    };
  }

  // A <ms> — advance
  if (verb === "A" || verb === "ADV") {
    const ms = Number(parts[1] ?? 5000);
    if (!Number.isFinite(ms) || ms <= 0) {
      return { ok: false, error: "A needs positive ms" };
    }
    return {
      ok: true,
      echo: `ADVANCE ${ms}ms`,
      cmds: [{ type: "Advance", ms }],
    };
  }

  return {
    ok: false,
    error: `Unknown verb ${verb} — try D · US · C · A`,
  };
}

export function CommandBar(props: Props) {
  const [line, setLine] = useState("");
  const [echo, setEcho] = useState("D unit · US unit ER · C GOA · A 5000");
  const [err, setErr] = useState(false);

  function submit() {
    const result = parseCommandLine(line, props);
    if (!result.ok) {
      setErr(true);
      setEcho(result.error);
      consoleAudio.play("fail");
      return;
    }
    for (const c of result.cmds) props.onCmd(c);
    setErr(false);
    setEcho(result.echo);
    setLine("");
    consoleAudio.play("ui");
  }

  return (
    <div className="command-bar" role="form" aria-label="Fiction command line">
      <span className="cb-prompt mono">CMD</span>
      <input
        className="cb-input mono"
        value={line}
        placeholder="D 3A12  ·  US 3A12 ER  ·  C GOA"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setLine(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button type="button" className="cb-go" onClick={submit}>
        SEND
      </button>
      <span className={`cb-echo mono ${err ? "err" : ""}`}>{echo}</span>
    </div>
  );
}
