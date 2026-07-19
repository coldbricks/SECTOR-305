# S2-ORPHANS — FIX staging (AGENT-S2-ORPHANS)

**Wave:** WAVE_2026-07-18_r2  
**Finding:** `docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md` § FINDING S2-ORPHANS  
**Disposition:** **FIX** (wire fixtures + DEFERRED phase table + automated guard)  
**Owned paths:**
- `packages/core/tests/orphan_codes.test.ts`
- `docs/waves/staging/S2_ORPHANS.md`

**Not owned (did not edit):** `packages/core/src/runtime.ts`  
Runtime emitters for previously orphaned hard codes are already present in-tree (jurisdiction, wrong type, channel abandon, status stale, reclass no radio, status launder soft). This agent only harvests via Runtime fixtures. If an emitter were missing for a non-deferred code, a change-request would go to ORCHESTRATOR for AGENT-RUNTIME — **none required this wave**.

---

## Acceptance (critic, falsifiable)

> Automated orphan guard: for every code in `FAIL_CODES ∪ SOFT_CODES`, either ≥1 test fixture produces it in a gradeLog, or it appears in a written amend table with a deferral phase. Guard fails on any silent orphan.

**Status:** SATISFIED by `orphan_codes.test.ts`.

---

## Coverage model

| Bucket | How covered |
|--------|-------------|
| Emitted | `collectEmitted()` runs Runtime fixtures → harvests `state.gradeLog[].code` |
| Deferred | `DEFERRED_CODES` map: code → non-empty phase tag (manifest amend / defer) |
| Silent orphan | In neither set → guard assertion fails |

### DEFERRED_CODES (phase tags)

| Code | Phase tag |
|------|-----------|
| `FAIL_INFOSET_VIOLATION` | `phase0_test_only_guard` (by design — grader-bug guard, not player path) |
| `FAIL_READBACK_WRONG` | `phase1_structured_ack_slots` |
| `FAIL_NARRATIVE_MISSING_CRITICAL` | `phase1_note_quality` |
| `SOFT_RADIO_WORDY` | `phase1_brevity_nlp` |
| `SOFT_SLOW_KEY` | `phase1_stimulus_timing` |
| `SOFT_NOTE_THIN` | `phase1_note_quality` |
| `SOFT_UNIT_SUBOPTIMAL_TYPE` | `phase1_assignment_soft` |
| `SOFT_LANGUAGE_NO_ATTEMPT` | `phase1_language_line` |
| `SOFT_STACK_REASON_THIN` | `phase1_hold_reasons` |
| `SOFT_MAP_OVERTRUST` | `phase1_map_ux` |
| `SOFT_CALLBACK_NOT_LOGGED` | `phase1_ct_path` |
| `SOFT_BOLO_INCOMPLETE` | `phase1_bolo` |
| `SOFT_TIMER_WARNING_IGNORED` | `phase1_timer_ui` |
| `SOFT_CONCURRENCY_TUNNEL` | `phase1_watch_soft` |

All other `FAIL_*` / `SOFT_*` must appear in a fixture gradeLog (asserted).

### Critic-named hard orphans — fixture emission (not deferred)

| Code | Fixture path in `collectEmitted` |
|------|----------------------------------|
| `FAIL_UNIT_WRONG_TYPE` | #4 TRAFFIC-CRASH + patrol while `u-3t1` traffic AVL |
| `FAIL_STATUS_STALE` | #9 OS + Advance 301s |
| `FAIL_JURISDICTION` | #3 Z-PORT / PORT without HANDOFF_NOTED |
| `FAIL_CHANNEL_ABANDON` | #8 two P1 pending |
| `FAIL_RECLASS_NO_RADIO` | #10 / #21 reclass after assign without radio air |
| `FAIL_NARRATIVE_MISSING_CRITICAL` | **deferred** phase1_note_quality |
| `FAIL_READBACK_WRONG` | **deferred** phase1_structured_ack_slots |

---

## Mutation protocol note

Guard predicate (same as production assertion):

```
missing = (FAIL_CODES ∪ SOFT_CODES) − emitted − keys(DEFERRED_CODES)
expect(missing).toEqual([])
```

**Documented mutation (executed inside test, not only prose):**

1. **Emission removed, DEFERRED unchanged:** delete `FAIL_JURISDICTION` from the harvested set → `missing` contains `FAIL_JURISDICTION` → would fail green guard.
2. **DEFERRED emptied + emission removed:** empty defer table and strip live codes → orphans include stripped hard codes **and** formerly deferred rows (`FAIL_INFOSET_VIOLATION`, `SOFT_BOLO_INCOMPLETE`, …).

Therefore: **if DEFERRED empty and emission removed, guard fails.** A vacuous green cannot survive either mutation.

Verifier (not this agent) may additionally corrupt a fixture / delete a DEFERRED row and re-run for red-then-green paste into the wave ledger.

---

## `npm test` output (orphan_codes)

Command: `npm test -- tests/orphan_codes.test.ts`  
(from repo root; workspace `@sector305/core`)

```
> sector-305@0.1.0 test
> npm run test -w @sector305/core tests/orphan_codes.test.ts


> @sector305/core@0.1.0 test
> vitest run tests/orphan_codes.test.ts


 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/orphan_codes.test.ts (2 tests) 14ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  22:21:24
   Duration  524ms (transform 71ms, setup 0ms, collect 140ms, tests 14ms, environment 0ms, prepare 55ms)
```

Raw capture also at: `docs/waves/staging/_orphan_codes_npm_test.txt`

---

## Honesty residual

Many soft codes remain **phase-deferred** rather than behaviorally live. That is an allowed branch of the critic’s required fix (“wire emitting logic + fixture OR shrink/defer via amend with phase tag”). Silent orphans are not allowed; deferred vocabulary is.

---

## Hand-off

- Integrator: merge `orphan_codes.test.ts`; full `npm test`.
- VERIFIER-S2-ORPHANS / MUTATION-PASS: re-run guard; optionally delete a DEFERRED row or corrupt fixture emission and confirm red.
- Closure of finding is **not** self-declared here (ORCHESTRATOR-PRIME §3.4).
