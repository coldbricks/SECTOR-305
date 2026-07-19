/**
 * Guided academy walkthrough for the A07 Ocean robbery checkride.
 * Steps unlock when the trainee performs the right console actions.
 */

import type { SectorState } from "@sector305/core";

export type CoachStepId =
  | "welcome"
  | "ack_queue"
  | "advance_cues"
  | "reclass"
  | "flags"
  | "verify"
  | "dispatch_pd"
  | "readback"
  | "fire_mutual"
  | "air_picture"
  | "clear_debrief";

export type CoachStep = {
  id: CoachStepId;
  title: string;
  body: string;
  /** Short HUD chip */
  chip: string;
  /** What to do next */
  action: string;
  /** Baked Dave trainer clip id (radio-voice/trainer_*.mp3) */
  trainerClipId?: string;
  /** Optional sim advance hint (ms) */
  suggestAdvanceMs?: number;
  /**
   * Flavor / multi-agency tour — not required for checkride instrument path.
   * Phase 0 freeze: fire/EMS is presentation only.
   */
  optional?: boolean;
  done: (ctx: CoachContext) => boolean;
};

export type CoachContext = {
  state: SectorState;
  selectedId: string | null;
  ownedIds: Set<string>;
  fireDispatches: number;
  heloSeen: boolean;
  trafficSeen: boolean;
};

export const OCEAN_WALKTHROUGH: CoachStep[] = [
  {
    id: "welcome",
    title: "Welcome to A07 glass",
    chip: "START",
    trainerClipId: "trainer_welcome",
    body: "This is the Ocean corridor checkride. You run an imperfect map, a CAD queue, and radio that grades you. Truth is hidden until cues land.",
    action: "Click NEXT — or select CFS 26-000142 in the queue.",
    done: (c) => c.selectedId === "cfs-001" || c.ownedIds.has("cfs-001"),
  },
  {
    id: "ack_queue",
    title: "Own the call",
    chip: "ACK",
    trainerClipId: "trainer_own_the_call",
    body: "Real CAD: pending calls scream until a telecommunicator takes them. Select the robbery/disturbance CFS so it moves from PENDING → OWNED. Paisley ding = focus.",
    action: "Click CFS 26-000142 until the queue shows OWNED · ACK.",
    done: (c) => c.ownedIds.has("cfs-001"),
  },
  {
    id: "advance_cues",
    title: "Let the story arrive",
    chip: "TIME",
    trainerClipId: "trainer_wait_cues",
    body: "At T+15s weapons/nature cues become knowable. At T+25s the real address (1400 Ocean) becomes knowable. Do not dispatch P1 before you can justify it.",
    action: "Press +30s once (or +5s a few times) until SIM ≥ 25s.",
    suggestAdvanceMs: 30000,
    done: (c) => c.state.clockMs >= 25000,
  },
  {
    id: "reclass",
    title: "Reclass nature + priority",
    chip: "P1",
    trainerClipId: "trainer_reclass",
    body: "Caller cues now support robbery in progress. Set nature to ROBBERY-IP (or closest robbery code) and priority to P1. Undercoding after knowable cues fails the ride.",
    action: "CFS detail → Nature ROBBERY-IP · Priority P1.",
    done: (c) => {
      const inc = c.state.incidents["cfs-001"];
      if (!inc) return false;
      const nat = (inc.natureCode || "").toUpperCase();
      return (
        inc.priority === "P1" &&
        (nat.includes("ROBB") || nat.includes("ROBBERY") || nat === "ROBBERY-IP")
      );
    },
  },
  {
    id: "flags",
    title: "Safety flags",
    chip: "FLAGS",
    trainerClipId: "trainer_flags",
    body: "Weapons and backup needs must be explicit for the grader and the air. Flag WEAPONS and NEEDS_BACKUP on the CFS.",
    action: "CFS detail → Flag WEAPONS · Flag BACKUP.",
    done: (c) => {
      const inc = c.state.incidents["cfs-001"];
      if (!inc) return false;
      const f = inc.flags || [];
      return f.includes("WEAPONS") && f.includes("NEEDS_BACKUP");
    },
  },
  {
    id: "verify",
    title: "Verify location",
    chip: "VERIFY",
    trainerClipId: "trainer_verify",
    body: "Never launch P1 on 'neon club somewhere.' Hit Verify → 1400 Ocean so location confidence is verified/partial before primary dispatch.",
    action: "CFS detail → Verify → 1400 Ocean (truth).",
    done: (c) => {
      const inc = c.state.incidents["cfs-001"];
      return (
        !!inc &&
        (inc.locationConfidence === "verified" ||
          inc.locationConfidence === "partial")
      );
    },
  },
  {
    id: "dispatch_pd",
    title: "Dispatch two patrols",
    chip: "TX",
    trainerClipId: "trainer_dispatch",
    body: "P1 needs depth. Dispatch 2× AVL patrol with a radio caption that includes units, P1, robbery, location, and weapons. That airs safety.",
    action: "Dispatch 2× AVL patrol (primary button).",
    done: (c) => {
      const inc = c.state.incidents["cfs-001"];
      return !!inc && (inc.assignedUnitIds?.length ?? 0) >= 2;
    },
  },
  {
    id: "readback",
    title: "Get the readbacks",
    chip: "ACK",
    trainerClipId: "trainer_readback",
    body: "Dispatch starts a readback clock. Sim unit ACKs so the channel closes clean — missed readback is a hard fail on this ride.",
    action: "CFS detail → Sim unit ACKs.",
    done: (c) => {
      const pending = c.state.radioLog.filter(
        (r) => r.requiresReadback && !r.readbackSatisfiedAtMs
      );
      const hadDispatch = c.state.radioLog.some((r) =>
        (r.caption || "").toLowerCase().includes("robber")
      );
      return hadDispatch && pending.length === 0;
    },
  },
  {
    id: "fire_mutual",
    title: "Fire tone-out (optional flavor)",
    chip: "FIRE",
    optional: true,
    body: "Optional tour only — Phase 0 grades police A-console, not Fire. Open APPARATUS for the room feel; does not affect checkride pass.",
    action: "Skip, or APPARATUS → TONE OUT a unit chip.",
    done: (c) => c.fireDispatches >= 1,
  },
  {
    id: "air_picture",
    title: "Air + traffic picture (optional)",
    chip: "HELO",
    optional: true,
    body: "Optional radar flavor: HELO + TRAF on the plate. Not live ADS-B/DOT. Skip if you are on the instrument path.",
    action: "Skip, or enable HELO and TRAF on RADAR stack.",
    done: (c) => c.heloSeen && c.trafficSeen,
  },
  {
    id: "clear_debrief",
    title: "Close the watch",
    chip: "AAR",
    trainerClipId: "trainer_clear",
    body: "When units clear and the CFS is done, end the session. Debrief shows hard fails and coaching. Pass = no hard fails.",
    action: "Sim on scene → Clear GOA (or hold for scenario) → End / Debrief.",
    done: (c) => {
      const inc = c.state.incidents["cfs-001"];
      return !!inc && (inc.status === "CLEARED" || inc.status === "CANCELLED");
    },
  },
];

/** Required (instrument) steps incomplete index; optional steps never block auto path. */
export function firstIncompleteStep(ctx: CoachContext): number {
  for (let i = 0; i < OCEAN_WALKTHROUGH.length; i++) {
    const s = OCEAN_WALKTHROUGH[i]!;
    if (s.optional) continue;
    if (!s.done(ctx)) return i;
  }
  // All required done — park on last required or clear_debrief
  for (let i = OCEAN_WALKTHROUGH.length - 1; i >= 0; i--) {
    if (!OCEAN_WALKTHROUGH[i]!.optional) return i;
  }
  return OCEAN_WALKTHROUGH.length - 1;
}

export function requiredStepsComplete(ctx: CoachContext): boolean {
  return OCEAN_WALKTHROUGH.filter((s) => !s.optional).every((s) => s.done(ctx));
}

export function stepProgress(ctx: CoachContext): {
  requiredDone: number;
  requiredTotal: number;
  optionalDone: number;
  optionalTotal: number;
} {
  const req = OCEAN_WALKTHROUGH.filter((s) => !s.optional);
  const opt = OCEAN_WALKTHROUGH.filter((s) => s.optional);
  return {
    requiredDone: req.filter((s) => s.done(ctx)).length,
    requiredTotal: req.length,
    optionalDone: opt.filter((s) => s.done(ctx)).length,
    optionalTotal: opt.length,
  };
}
