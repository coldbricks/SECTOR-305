# Staging — AGENT-S1-PSYCHIC / WAVE_2026-07-18_r2

**Finding:** S1-PSYCHIC (docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md)  
**Disposition:** FIX  
**Agent:** AGENT-S1-PSYCHIC  
**Owned paths only** (no merge-for-efficiency; no unowned writes)

## Summary

Flagship checkride goldens no longer encode clairvoyance. Truth facets are gated by `knowableSchedule`; every truth-derived golden command postdates its enabling cue; fail-path hard fails fire only after the weapons/acuity cue.

## Changes

| Path | Change |
|------|--------|
| `packages/core/src/fixtures.ts` | `incidentRobberyBadAddress().truth.knowableSchedule`: weapons/nature/priority @15000, location @25000 |
| `packages/core/tests/checkride_sessions.ts` | Fair pass/fail command timelines; removed double-`Advance` (applyAll already advances to `atMs`) so dispatch lands @27000 not @52000 |
| `packages/core/tests/psychic_guard.test.ts` | Automated no-clairvoyance: schedule shape, in-memory + committed SessionRecords, fail grade `atMs >=` weapons cue, sacred three present |
| `packages/core/tests/checkride.test.ts` | FAIL multiset includes undercode/verify/backup/readback/safety; grade times ≥15000 and ≥27000; PASS static cue checks |
| `scenarios/.../session_fail.json` | Post-cue fail golden (note @2s, undercode dispatch @27s, NoOp @80s for readback window) |
| `scenarios/.../session_pass.json` | Post-cue pass golden (reclass @17s+, verify 1400 @27s, clean close) |
| `scenarios/.../EXPECTED.md` | Binding narrative + fairness table for C10 |

## Acceptance mapping

| Critic acceptance | Evidence |
|-------------------|----------|
| knowableSchedule weapons/nature/priority @15000, location @25000 | fixtures + psychic_guard schedule test |
| golden commands post-cue only | checkride_sessions + session_*.json + psychic_guard scans |
| automated no-clairvoyance test | `psychic_guard.test.ts` (6 tests) |
| fail hard-fail atMs ≥ cue for undercode/verify/backup/safety | psychic_guard + checkride FAIL test; observed grades @27000 |

## Observed hard multiset (fail path)

```
FAIL_PRIORITY_UNDERCODE @27000
FAIL_NO_VERIFY @27000
FAIL_NO_BACKUP @27000
FAIL_SAFETY_NOT_AIRED @27000
FAIL_NO_READBACK @80000
```

Pass path: `hardFails=[]`, `passed=true`.

## npm test paste (psychic + checkride)

Command:

```
cd packages/core
npx vitest run tests/psychic_guard.test.ts tests/checkride.test.ts --reporter=verbose
```

```
 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/psychic_guard.test.ts > S1-PSYCHIC golden fairness guard > fixture knowableSchedule: weapons/nature/priority @15000, location @25000 1ms
 ✓ tests/psychic_guard.test.ts > S1-PSYCHIC golden fairness guard > in-memory passCommands never use truth before cue 0ms
 ✓ tests/psychic_guard.test.ts > S1-PSYCHIC golden fairness guard > in-memory failCommands dispatch only after weapons cue 0ms
 ✓ tests/psychic_guard.test.ts > S1-PSYCHIC golden fairness guard > committed session_pass.json never uses truth before cue 0ms
 ✓ tests/psychic_guard.test.ts > S1-PSYCHIC golden fairness guard > committed session_fail.json dispatch only after weapons cue 0ms
 ✓ tests/psychic_guard.test.ts > S1-PSYCHIC golden fairness guard > fail runtime hard-fails (undercode/verify/backup/safety) atMs >= weapons cue 4ms
 ✓ tests/checkride.test.ts > checkride goldens (fair timeline) > FAIL post-cue: undercode + no verify + single unit + no weapons air + no readback 2ms
 ✓ tests/checkride.test.ts > checkride goldens (fair timeline) > PASS: post-cue verify, reclass P1, backup, weapons aired, readbacks, clean close 3ms
 ✓ tests/checkride.test.ts > checkride goldens (fair timeline) > FAIL: concurrency — P1 ages while player only works P4 cosmetics 0ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
   Start at  22:21:51
   Duration  522ms (transform 93ms, setup 0ms, collect 278ms, tests 12ms, environment 0ms, prepare 109ms)
```

Also verified (non-owned, read-only): `tests/sacred_invariant.test.ts` 5/5 green against rewritten session JSONs.

## Integrator notes

- Do **not** reintroduce bare `Advance(ms)` steps that re-add wall time after `applyAll` already advanced to `atMs` — that double-counted and put fail grades at 52000.
- Closure of this finding requires a separate VERIFIER-S1-PSYCHIC (agent that fixed does not self-close per ORCHESTRATOR_PRIME §3.4).
- Race note: S1-VACUOUS mutation test rewrites `session_fail.json` in place; parallel suite runs can flake psychic_guard committed-file scan. Prefer sequential or restore-always if CI flakes.
