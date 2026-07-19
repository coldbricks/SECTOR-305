# SECTOR 305 — House doctrine (S305 / A07)

**Status:** Machine-aligned human law  
**Pack:** `packs/miami-a07-police-v0`  
**Epistemic label:** **FICTIONAL** training doctrine. Standards-**aligned** concepts drawn from public CAD/PSAP practice literature — **not** any real agency’s SOP, **not** IAED card text, **not** APCO/NENA certification material.

## Grounding (public concepts, not copied protocols)

What we implement is consistent with publicly discussed PSAP/CAD practice:

| Concept | Public grounding | S305 expression |
|---------|------------------|-----------------|
| Call-taker vs dispatcher roles | Industry role split (intake vs radio/unit control) | C-side injects CFS; player is A-console |
| CFS lifecycle + timestamps | LE CAD functional specs (status, times, unit history) | PENDING→DISPATCHED→WORKING→CLEARED |
| Unit status management | CAD unit status continuously monitored; elapsed timers | AVL/DIS/ER/OS/CLR/OOS graph |
| Priority hierarchy | Agencies use multi-level priority (e.g. life/weapon vs routine) | P0–P5 house table |
| Location verification before response | ANI/ALI + verify; incomplete address is a real failure mode | `locationConfidence` gate |
| Plain language radio | Many FL/centers prefer plain speech; multi-discipline plain English | No 10-code requirement |
| Documentation / disposition | CAD narrative + close codes for liability/QA | Disposition required on clear |
| Language access as ops friction | Real multilingual centers (EN/ES/Creole in South FL) | Caller language + delay hooks (content) |

**We do not ship:** Priority Dispatch / IAED question cards, determinant codes, or any “you are now certified” claim.

## Priority table (house)

| Code | Name | Dispatch SLA (sim) | Stack |
|------|------|--------------------|-------|
| P0 | Officer emergency | 15s | No |
| P1 | In progress life/weapon | 60s | No |
| P2 | In progress / urgent | 120s | No |
| P3 | Prompt | 300s | Yes |
| P4 | Routine | 900s | Yes |
| P5 | Admin / info | 3600s | Yes |

**Reclass:** Upgrade immediately on better info. Undercoding weapons/in-progress truth = hard fail.

## Unit status graph (enforced)

```
AVL → DIS → ER → OS → CLR → AVL
         ↘ OOS, EMR as allowed edges
```

**Illegal:** AVL→OS, DIS→OS (must ER), assign non-AVL (unless pack says otherwise).

## Radio (plain language)

Dispatch template elements: **unit(s), priority, nature, location, safety**.  
P0/P1 require **readback** within pack timeout (default 45s).  
Emergency traffic holds non-emergency TX.

**Safety airing (S2-SAFETYHATCH house law):** When weapons are knowable (player WEAPONS flag or post-cue knowable truth), the engine grades the **final effective caption** regardless of source. If the player supplies a `radioCaption` that omits a weapons/armed element → `FAIL_SAFETY_NOT_AIRED`. If the player omits `radioCaption`, the auto-caption **includes** `weapon reported` so silence cannot skip the safety check.

## Backup

P1 violence/weapons/robbery-IP: **≥2 units** (pack `minBackupUnitsP1`).

## Information-set grading

Decisions scored against **what was knowable** via CFS fields, notes, and flags. Hidden `IncidentTruth` drives scenario honesty; player never sees truth panel in production UI.

## Jurisdiction fiction

Zones: Ocean, Collins, Downtown, Wynwood, Port edge. Port = handoff jurisdiction for stretch scenarios.

## CFS clear force-clear (house law — S3-2)

When a CFS is **CLEARED** with disposition, the engine:

1. Grades `FAIL_STATUS_DIRTY_CLOSE` for any unit still DIS/ER/OS on that CFS  
2. Then **force-sets** those units to AVL (administrative clear)

This is intentional house law, not silent auto-correct of illegal mid-call transitions. Mid-call status changes still go through the 64-cell matrix. Documented system CAD note is appended on force-clear.

## Disclaimer (ship on every debrief)

> Training simulation. Fictional PSAP and geography. Standards-aligned educational concepts. Not a substitute for agency training. Completing tracks does not grant real telecommunicator certification. Not affiliated with Miami-Dade or any certification body.
