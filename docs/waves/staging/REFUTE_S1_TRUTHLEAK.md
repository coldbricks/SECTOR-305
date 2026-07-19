# REFUTE_S1_TRUTHLEAK — VERIFIER-S1-TRUTHLEAK

**Agent:** VERIFIER-S1-TRUTHLEAK  
**Wave:** WAVE_2026-07-18_r2  
**Role:** Independent refuter / acceptance runner (ORCHESTRATOR_PRIME §3.4 / §4.1 — not the fix author)  
**Date:** 2026-07-18  
**Product code:** read-only. This file is the only write.

**Source finding:** `docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md` — FINDING S1-TRUTHLEAK  
**Law:** `docs/ORCHESTRATOR_PRIME.md` §4.1 — grading may read `IncidentTruth` only through the knowable gate (`isHighAcuityKnowable` or equivalent). Every deliberate gate-exempt `truth.` read carries `// TRUTH-GATE-OK(<clause>)` on the same line or the line above.

**Closure rule used by this verifier:**  
Any **grading** use of `truth.` without `isHighAcuityKnowable` **or** a `// TRUTH-GATE-OK` tag in scope → **STILL OPEN**.  
Otherwise, and if acceptance fixtures pass → **FIXED**.

---

## Critic claim (restated)

`dispatchUnits` graded acuity from **hidden** truth without the knowable gate:

1. Undercode-at-dispatch read `truth.weapons || truth.inProgress || rank(truth) <= 1` directly — did **not** call `isHighAcuityKnowable()`.
2. Verify gate: `highAcuity = rank(inc.priority) <= 1 || rank(inc.truth.actualPriority) <= 1` — hidden P1 raised the bar on a CFS presented as P3/P4.
3. Readback: `requiresReadback` from `rank(inc.truth.actualPriority) <= 1` — protocol obligation from unseen facts.

**Required fix:** Route every dispatch-time acuity decision through `isHighAcuityKnowable()` (or equivalent).  
**Acceptance (falsifiable):** (a) pre-cue dispatch at presented priority → zero hard fails from this path; (b) identical post-cue → `FAIL_PRIORITY_UNDERCODE` (verify/readback gates apply when knowable).

---

## Grep — all `truth.` reads in `packages/core/src/runtime.ts`

Command equivalent (PowerShell; `rg` not on PATH):

```
Select-String -Path packages\core\src\runtime.ts -Pattern "truth\."
```

### Raw matches (line:content)

```
344:if (cmd.location?.zoneId && cmd.location.zoneId === inc.truth.actualLocation.zoneId) {
347:...inc.truth.actualLocation,
348:freeform: cmd.location.freeform ?? inc.truth.actualLocation.freeform,
435:if (priorityRank(priority) > priorityRank(inc.truth.actualPriority)) {
442:message: `Priority undercoded (${priority}) vs known/truth acuity (${inc.truth.actualPriority}).`,
444:expected: inc.truth.actualPriority,
455:message: `Priority ${priority} lower than scenario truth ${inc.truth.actualPriority} (not yet knowable).`,
457:expected: inc.truth.actualPriority,
470:const sched = inc.truth.knowableSchedule;
474:inc.truth.weapons ||
475:inc.truth.inProgress ||
476:priorityRank(inc.truth.actualPriority) <= 1
492:const sched = inc.truth.knowableSchedule;
516:if (cue.facet === "nature" && inc.truth.actualNature) {
584:priorityRank(inc.priority) > priorityRank(inc.truth.actualPriority) &&
592:message: `Dispatched at ${inc.priority} while truth acuity is ${inc.truth.actualPriority}.`,
594:expected: inc.truth.actualPriority,
629:inc.location.zoneId !== inc.truth.actualLocation.zoneId
638:expected: inc.truth.actualLocation.zoneId,
696:// Backup policy — only from knowable high risk / flags (no raw truth.weapons pre-cue)
701:(inc.truth.requiresBackup ||
769:// TRUTH-GATE-OK(dispatch-safety): truth.weapons only when isHighAcuityKnowable
772:(this.isHighAcuityKnowable(inc) && inc.truth.weapons);
```

### Tag / gate inventory (same file)

```
343:// TRUTH-GATE-OK(verify-alignment): world-model fill after player-correct zone, not acuity grading
434:// TRUTH-GATE-OK(setPriority): hard path gated by isHighAcuityKnowable; soft path pre-cue only
436:if (this.isHighAcuityKnowable(inc)) {
467:private isHighAcuityKnowable(inc: Incident): boolean {
469:// TRUTH-GATE-OK(gate-definition): this method IS the knowable gate
491:// TRUTH-GATE-OK(schedule-inject): reveals facets into player-visible notes/flags at cue time
582:// TRUTH-GATE-OK(dispatch-undercode): hard-fail only when isHighAcuityKnowable
585:this.isHighAcuityKnowable(inc)
602:// TRUTH-GATE-OK(dispatch-verify): acuity via isHighAcuityKnowable, not raw actualPriority
604:priorityRank(inc.priority) <= 1 || this.isHighAcuityKnowable(inc);
626:// TRUTH-GATE-OK(verified-zone-compare): only after player claimed verified; grades wrong verify
697:// TRUTH-GATE-OK(dispatch-backup): requiresBackup only when isHighAcuityKnowable
700:(this.isHighAcuityKnowable(inc) &&
769:// TRUTH-GATE-OK(dispatch-safety): truth.weapons only when isHighAcuityKnowable
772:(this.isHighAcuityKnowable(inc) && inc.truth.weapons);
806:// TRUTH-GATE-OK(dispatch-readback): isHighAcuityKnowable only
808:priorityRank(inc.priority) <= 1 || this.isHighAcuityKnowable(inc),
```

---

## Per-site adjudication (grading vs exempt)

| Lines | Use | Grading? | `isHighAcuityKnowable` | `// TRUTH-GATE-OK` | Status |
|------:|-----|:--------:|:---------------------:|:-----------------:|:------:|
| 343–348 | Verify-location world-model fill when player zone matches truth | No (model fill) | n/a | `verify-alignment` | OK |
| 434–457 | `setPriority` undercode: hard only if knowable; soft pre-cue | Yes | Hard branch yes | `setPriority` | OK |
| 467–476 | **Gate definition** itself (empty-schedule legacy + schedule scan) | Gate | *is* the gate | `gate-definition` | OK |
| 491–516 | Knowable schedule inject → notes/flags | No (reveal) | n/a | `schedule-inject` | OK |
| 582–594 | **dispatch undercode** hard fail | Yes | **yes** (conjoined) | `dispatch-undercode` | OK |
| 601–604 | **dispatch verify** high-acuity gate | Yes | **yes** | `dispatch-verify` | OK |
| 625–638 | Wrong *verified* zone vs truth | Yes (post-claim) | n/a (player claimed verified) | `verified-zone-compare` | OK |
| 696–703 | **dispatch backup** min units | Yes | **yes** (wraps `truth.requiresBackup`) | `dispatch-backup` | OK |
| 769–772 | **dispatch safety** weapons air | Yes | **yes** | `dispatch-safety` | OK |
| 805–808 | **dispatch readback** requirement | Yes (protocol) | **yes** — **no raw `truth.`** | `dispatch-readback` | OK |

### Critic bullets vs current code

| Critic bullet | Current evidence | Closed? |
|---------------|------------------|:-------:|
| Undercode-at-dispatch skips knowable gate | `runtime.ts:582–586` — `priorityRank(...) && this.isHighAcuityKnowable(inc)` | Yes |
| Verify gate uses raw `truth.actualPriority` | `runtime.ts:602–604` — `priorityRank(inc.priority) <= 1 \|\| this.isHighAcuityKnowable(inc)` — **no** raw truth rank | Yes |
| Readback from raw truth priority | `runtime.ts:806–808` — same knowable gate; **zero** `truth.` on that line | Yes |

**Grep conclusion:** Zero **ungated / untagged grading** `truth.` reads in `runtime.ts`. Rule → not STILL OPEN on mechanical grep.

**Noted residual (does not reopen under critic acceptance):** empty `knowableSchedule` still treats high truth acuity as immediately knowable (`isHighAcuityKnowable` legacy branch, tagged `gate-definition`). Flagship fixture schedule is non-empty; pre/post-cue fixtures cover the fair path. Legacy empty-schedule hard-fail is intentional authoring convenience (`infoset.test.ts` second case).

---

## Command run

```
cd C:\Users\coldb\SECTOR-305
npm test -- tests/critic_s1_s2.test.ts tests/infoset.test.ts
```

### Pasted output (green)

```
> sector-305@0.1.0 test
> npm run test -w @sector305/core tests/critic_s1_s2.test.ts tests/infoset.test.ts


> @sector305/core@0.1.0 test
> vitest run tests/critic_s1_s2.test.ts tests/infoset.test.ts


 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/infoset.test.ts (2 tests) 2ms
 ✓ tests/critic_s1_s2.test.ts (8 tests) 10ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Start at  22:25:49
   Duration  510ms (transform 83ms, setup 0ms, collect 274ms, tests 13ms, environment 0ms, prepare 111ms)
```

### Acceptance mapping (S1-TRUTHLEAK fixtures)

| Acceptance | Test | Result |
|------------|------|--------|
| (a) pre-cue dispatch at presented P3 → no hard undercode/verify from hidden truth | `critic_s1_s2.test.ts` — `(a) pre-cue dispatch...` | PASS (suite green) |
| (b) post-cue same undercode → `FAIL_PRIORITY_UNDERCODE` | `critic_s1_s2.test.ts` — `(b) post-cue...` | PASS |
| setPriority pre-cue soft / post-cue hard (C10) | `infoset.test.ts` — undercode before weapons cue | PASS |
| legacy empty schedule still hard-fails | `infoset.test.ts` — legacy empty schedule | PASS |

---

## Verdict

**FIXED** — not STILL OPEN.

1. Mechanical grep of every `truth.` in `packages/core/src/runtime.ts`: every grading use is either behind `isHighAcuityKnowable` and/or tagged `// TRUTH-GATE-OK(...)`.
2. The three original dispatch leak paths (undercode / verify / readback) no longer bind protocol from raw hidden `actualPriority`.
3. Falsifiable acceptance tests green: 10/10 in `critic_s1_s2.test.ts` + `infoset.test.ts`.

**No reopen.** Residual: empty-schedule legacy knowable path remains by design (tagged gate-definition + infoset fixture); out of scope for S1-TRUTHLEAK acceptance as stated by the external critic.
