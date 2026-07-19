# RUNTIME_SERIAL — S1-TRUTHLEAK / S2-SAFETYHATCH / S3-1 / S3-2 / S3-3

**Agent:** SERIAL runtime writer (barrier on `packages/core/src/runtime.ts`)  
**Wave:** WAVE_2026-07-18_r2  
**Date:** 2026-07-18  
**Ownership:** `runtime.ts` + `critic_s1_s2.test.ts` + `docs/DOCTRINE.md` (force-clear / radio safety). Did **not** touch psychic/vacuous/orphan ownership paths.

---

## Findings closed (FIX)

### S1-TRUTHLEAK
- Dispatch undercode, verify gate, readback, backup, and safety all route acuity through `isHighAcuityKnowable()`.
- Pre-cue (t=0, presented P3): no `FAIL_PRIORITY_UNDERCODE` / `FAIL_NO_VERIFY` from hidden truth.
- Post-cue (t≥15000): undercode at presented P3 emits `FAIL_PRIORITY_UNDERCODE`.
- Every `truth.` read in `runtime.ts` carries `// TRUTH-GATE-OK(...)` on the line above or is inside the gate definition / schedule inject.

### S2-SAFETYHATCH
- Effective caption graded after build.
- Player caption without weapons element → `FAIL_SAFETY_NOT_AIRED`.
- Omitted `radioCaption` → auto-caption appends `weapon reported` (silence cannot skip safety).
- House law written in `docs/DOCTRINE.md` §Radio.

### S3-1
- `unitRadioRx` DIS + "on scene" phrase: soft `SOFT_STATUS_QUERY_LATE` then legal DIS→ER→OS progression.

### S3-2
- `docs/DOCTRINE.md` §CFS clear force-clear: grade dirty-close then administrative force AVL.
- `clearIncident` appends system note containing `force-clear`; units left DIS/ER/OS become AVL.

### S3-3
- `idSeq` is instance-private (constructor-reset local field).
- Interleaved runtimes: both first grades are `gr_2` (sim event takes `ev_1`); second grade on A is `gr_4`; B length stays 1.

---

## Files touched

| Path | Change |
|------|--------|
| `packages/core/src/runtime.ts` | Gate routing + TRUTH-GATE-OK tags; safety effective caption; soft launder mark; force-clear note; instance idSeq |
| `packages/core/tests/critic_s1_s2.test.ts` | Acceptance fixtures for all five; S3-3 id expectations corrected (`gr_2`/`gr_4`) |
| `docs/DOCTRINE.md` | §Radio safety airing + §CFS clear force-clear |

**Not touched:** `fixtures.ts`, sacred_invariant, psychic_guard, orphan_codes, grade/codes vocabulary shrink.

---

## TRUTH-GATE-OK inventory (`runtime.ts`)

| Tag | Purpose |
|-----|---------|
| `verify-alignment` | World-model fill after player-correct zone verify |
| `setPriority` | Hard undercode gated; soft pre-cue only |
| `gate-definition` | `isHighAcuityKnowable` body |
| `schedule-inject` | Cue schedule → notes/flags |
| `dispatch-undercode` | Dispatch undercode only when knowable |
| `dispatch-verify` | Verify gate via knowable acuity |
| `verified-zone-compare` | FAIL_WRONG_LOCATION after claimed verified |
| `dispatch-backup` | requiresBackup only when knowable |
| `dispatch-safety` | truth.weapons only when knowable |
| `dispatch-readback` | requiresReadback via knowable acuity |

---

## Acceptance command output

Command:

```
npx vitest run packages/core/tests/critic_s1_s2.test.ts packages/core/tests/infoset.test.ts packages/core/tests/checkride.test.ts packages/core/tests/sacred_invariant.test.ts
```

Output (2026-07-18 ~22:21 local):

```
 RUN  v3.2.7 C:/Users/coldb/SECTOR-305

 ✓ packages/core/tests/infoset.test.ts (2 tests) 2ms
 ✓ packages/core/tests/critic_s1_s2.test.ts (8 tests) 11ms
 ✓ packages/core/tests/checkride.test.ts (3 tests) 6ms
 ✓ packages/core/tests/sacred_invariant.test.ts (5 tests) 14ms

 Test Files  4 passed (4)
      Tests  18 passed (18)
   Start at  22:21:23
   Duration  703ms (transform 276ms, setup 0ms, collect 734ms, tests 34ms, environment 0ms, prepare 357ms)
```

### critic_s1_s2 breakdown (8/8)

| Suite | Result |
|-------|--------|
| S1-TRUTHLEAK (a) pre-cue no hard undercode/verify | PASS |
| S1-TRUTHLEAK (b) post-cue undercode | PASS |
| S2-SAFETYHATCH explicit caption missing weapons | PASS |
| S2-SAFETYHATCH omitted caption auto-includes weapon | PASS |
| S3-1 DIS→on scene soft mark | PASS |
| S3-3 sequential runtime grade ids equal | PASS |
| S3-3 interleaved runtimes independent | PASS |
| S3-2 dirty-close then force AVL | PASS |

---

## Integrator notes

- Ready for INTEGRATOR-R2 merge + full `npm test`.
- Verifiers should re-run the command above and (per §3.2) mutation-pass: corrupt `isHighAcuityKnowable` to always-true and expect pre-cue fixture red; restore green.
