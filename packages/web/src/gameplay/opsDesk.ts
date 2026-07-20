/**
 * Pure ops-desk helpers — pressure instruments for the A-console.
 * No doctrine invention: uses pack SLA numbers and incident timestamps only.
 */
import type { Incident, PriorityCode } from "@sector305/core";

export type SlaBand = "ok" | "warn" | "critical" | "breach" | "na";

export type SlaView = {
  slaMs: number;
  ageMs: number;
  remainMs: number;
  ratio: number; // 0..1+ age/sla
  band: SlaBand;
  label: string;
};

const DEFAULT_SLA: Record<PriorityCode, number> = {
  P0: 15_000,
  P1: 60_000,
  P2: 120_000,
  P3: 300_000,
  P4: 900_000,
  P5: 3_600_000,
};

export function slaMsFor(
  priority: string,
  packPriorities?: Array<{ code: string; dispatchSlaMs: number }>
): number {
  const hit = packPriorities?.find((p) => p.code === priority);
  if (hit) return hit.dispatchSlaMs;
  return DEFAULT_SLA[priority as PriorityCode] ?? 300_000;
}

/** SLA only meaningful while still pending without assignment. */
export function needsDispatchSla(inc: Incident): boolean {
  if (inc.status === "CLEARED" || inc.status === "CANCELLED") return false;
  if ((inc.assignedUnitIds?.length ?? 0) > 0) return false;
  if (inc.firstDispatchAtMs != null) return false;
  if (inc.status === "HOLD") return true;
  return inc.status === "PENDING" || inc.status === "WORKING";
}

export function computeSla(
  inc: Incident,
  clockMs: number,
  packPriorities?: Array<{ code: string; dispatchSlaMs: number }>
): SlaView {
  const slaMs = slaMsFor(inc.priority, packPriorities);
  if (!needsDispatchSla(inc)) {
    return {
      slaMs,
      ageMs: Math.max(0, clockMs - inc.receivedAtMs),
      remainMs: slaMs,
      ratio: 0,
      band: "na",
      label: "DISP",
    };
  }
  const ageMs = Math.max(0, clockMs - inc.receivedAtMs);
  const remainMs = slaMs - ageMs;
  const ratio = ageMs / Math.max(1, slaMs);
  let band: SlaBand = "ok";
  if (ratio >= 1) band = "breach";
  else if (ratio >= 0.85) band = "critical";
  else if (ratio >= 0.5) band = "warn";
  const label =
    band === "breach"
      ? "SLA BREACH"
      : remainMs < 60_000
        ? `${Math.ceil(remainMs / 1000)}s`
        : `${Math.ceil(remainMs / 1000)}s`;
  return { slaMs, ageMs, remainMs, ratio, band, label };
}

/** Incidents that have “rung in” by sim clock (staged arrival). */
export function visibleIncidents(
  incidents: Incident[],
  clockMs: number
): Incident[] {
  return incidents
    .filter((i) => i.receivedAtMs <= clockMs)
    .sort((a, b) => a.receivedAtMs - b.receivedAtMs);
}

export function highAcuityPending(incidents: Incident[]): number {
  return incidents.filter(
    (i) =>
      needsDispatchSla(i) &&
      (i.priority === "P0" || i.priority === "P1" || i.priority === "P2")
  ).length;
}

export type CueFacet = {
  atMs: number;
  facet: string;
  summary?: string;
};

/** Collapse knowable schedule into unique facet-open times for HUD. */
export function cueWindowsFromSchedule(
  schedule: CueFacet[] | undefined,
  clockMs: number
): Array<{ facet: string; atMs: number; open: boolean; summary?: string }> {
  if (!schedule?.length) {
    return [
      {
        facet: "nature / priority",
        atMs: 0,
        open: true,
        summary: "No delayed schedule — facets knowable when CAD shows them",
      },
    ];
  }
  const byFacet = new Map<string, CueFacet>();
  for (const c of schedule) {
    const prev = byFacet.get(c.facet);
    if (!prev || c.atMs < prev.atMs) byFacet.set(c.facet, c);
  }
  return [...byFacet.values()]
    .sort((a, b) => a.atMs - b.atMs)
    .map((c) => ({
      facet: c.facet,
      atMs: c.atMs,
      open: clockMs >= c.atMs,
      summary: c.summary,
    }));
}

export function formatMs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
