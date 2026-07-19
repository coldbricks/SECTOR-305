# VERIFIER — S3-1 / S3-2 / S3-3 / S3-4 / S3-5

**Role:** VERIFIER (refute-side; not the builder)  
**Wave:** WAVE_2026-07-18_r2  
**PRIME:** docs/ORCHESTRATOR_PRIME.md v1.1 (read at spawn)  
**Date:** 2026-07-18  
**Scope:** Acceptance checks only for S3-1…S3-5. No product code edited.

---

## Summary

| Finding | Disposition | Status |
|---------|-------------|--------|
| **S3-1** | soft launder test exists + passes | **FIXED** |
| **S3-2** | force-clear doctrine + test | **FIXED** |
| **S3-3** | instance idSeq; interleaved independent | **FIXED** |
| **S3-4** | scenario_json_load consumes JSON | **FIXED** |
| **S3-5** | COVERAGE_TABLE count matches `npm test` total | **OPEN** |

**Full suite:** 14 files, **96/96 passed** (see paste below).  
**Blocker for S3-5:** `docs/COVERAGE_TABLE.md` header cites **93**; live suite is **96**.

---

## S3-1 — DIS→on scene soft mark — **FIXED**

**Acceptance:** DIS→on scene soft mark fixture exists and passes.

**Evidence (code):**

- `packages/core/src/runtime.ts` ~1092–1108: on `UnitRadioRx` with “on scene” while unit is DIS, emits soft `SOFT_STATUS_QUERY_LATE` (rubric `STA_LAUNDER`), then legal DIS→ER→OS progression.
- `packages/core/tests/critic_s1_s2.test.ts` describe `S3-1 status laundering soft mark`:
  - dispatches units, sends caption `"3A12 on scene"` from DIS
  - asserts `gradeLog` contains `SOFT_STATUS_QUERY_LATE`

**Evidence (run):**

```
 ✓ tests/critic_s1_s2.test.ts (8 tests) 15ms
```

Includes: `S3-1 status laundering soft mark > DIS → on scene phrase yields SOFT_STATUS_QUERY_LATE` — **PASS**.

---

## S3-2 — force-clear doctrine + test — **FIXED**

**Acceptance:** Doctrine sentence + test that force-clear leaves units AVL after dirty-close grade.

**Evidence (doctrine):** `docs/DOCTRINE.md` § “CFS clear force-clear (house law — S3-2)”:

1. Grade `FAIL_STATUS_DIRTY_CLOSE` for units still DIS/ER/OS  
2. Force-set those units to AVL  
3. Append documented system CAD note on force-clear  

**Evidence (code):** `packages/core/src/runtime.ts` ~1359–1373:

- After dirty-close grades, assigned units forced to `AVL`
- System note text includes `force-clear`

**Evidence (test):** `packages/core/tests/critic_s1_s2.test.ts` describe `S3-2 force-clear house law`:

- Dispatch leaves units DIS; `ClearIncident` GOA
- Asserts `FAIL_STATUS_DIRTY_CLOSE`
- Asserts both units status `AVL`
- Asserts incident notes include `"force-clear"`

**Evidence (run):** S3-2 case inside `critic_s1_s2.test.ts` — **PASS** (full file 8/8).

---

## S3-3 — instance idSeq interleaved — **FIXED**

**Acceptance:** Instance-local `idSeq`; interleaved runtimes do not cross-contaminate IDs.

**Evidence (code):** `packages/core/src/runtime.ts`:

```ts
private idSeq = 0;
private nid(prefix: string): string {
  this.idSeq += 1;
  return `${prefix}_${this.idSeq.toString(36)}`;
}
// constructor: this.idSeq = 0;
```

No module-global id counter remains (grep of `packages/core/src` shows only the instance field + `nid` call sites).

**Evidence (test):** `critic_s1_s2.test.ts` describe `S3-3 instance idSeq no interleave`:

1. Sequential runtimes produce identical first grade ids  
2. Interleaved A/B: both first grades `gr_2` (sim event takes `ev_1`); A second grade `gr_4`; B gradeLog length 1  

**Evidence (run):** both S3-3 cases — **PASS** (file 8/8). Earlier S3-5 staging capture showed this test red with expected `gr_1` vs received `gr_2`; current expectations match instance + event-slot behavior and are green.

---

## S3-4 — scenario_json_load consumes JSON — **FIXED**

**Acceptance:** `scenario.json` consumed by a test/code path (checkride + watch fields asserted).

**Evidence (code path):** `packages/core/tests/scenario_json_load.test.ts`

- `loadScenarioJson` — `readFileSync` + `JSON.parse` from repo-root paths; fails if missing  
- Checkride: id/kind/packId/seed/title/tags/passConditions/expectedHardFailsOnFailSession + `ScenarioSchema` spine  
- Watch: durationMs/minCfs/minUnits/implementation exists on disk + spine  
- Uniqueness/pack-bound third test  

**Evidence (run):**

```
 ✓ tests/scenario_json_load.test.ts (3 tests) 6ms
```

All three S3-4 tests — **PASS**.

---

## S3-5 — COVERAGE_TABLE count matches suite — **OPEN**

**Acceptance:** Header suite test count in `docs/COVERAGE_TABLE.md` equals live `npm test` total.

**Table (live read):**

```
**Tests:** `npm test` → **93** suite tests (live AGENT-S3-5 capture; raw output in `docs/waves/staging/S3_5.md`)
```

**Live suite (this verifier, 2026-07-18):**

```
Test Files  14 passed (14)
     Tests  96 passed (96)
```

| Source | Count |
|--------|-------|
| COVERAGE_TABLE header | **93** |
| `npm test` total | **96** |
| Delta | **−3 (table understates)** |

**Diagnosis:** S3-5 agent correctly locked 93 against a contemporaneous run (92 pass + 1 fail during S3-3 expectation mismatch). Suite grew afterward (observed now: `psychic_guard` 6 tests, `scenario_json_load` 3 tests; S3_5.md capture had 4 and 2 respectively → +3). Header was not refreshed after green integration. Secondary drift: M10 row still says “75 tests”.

**Closure condition for S3-5:** set COVERAGE_TABLE header (and any row totals that claim suite size) to **96**, paste a fresh full-suite green, and re-verify count equality. Out of this verifier’s write ownership — left **OPEN**.

---

## Full suite paste (`npm test`)

**cwd:** `C:\Users\coldb\SECTOR-305`  
**command:** `npm test`

```
> sector-305@0.1.0 test
> npm run test -w @sector305/core


> @sector305/core@0.1.0 test
> vitest run


 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/kill_list_guards.test.ts (7 tests) 13ms
 ✓ tests/pack_validate.test.ts (4 tests) 6ms
 ✓ tests/status.test.ts (4 tests) 3ms
 ✓ tests/psychic_guard.test.ts (6 tests) 7ms
 ✓ tests/radio_protocol.test.ts (6 tests) 10ms
 ✓ tests/infoset.test.ts (2 tests) 3ms
 ✓ tests/checkride.test.ts (3 tests) 8ms
 ✓ tests/orphan_codes.test.ts (2 tests) 18ms
 ✓ tests/critic_s1_s2.test.ts (8 tests) 15ms
 ✓ tests/scenario_json_load.test.ts (3 tests) 6ms
 ✓ tests/sacred_invariant.test.ts (5 tests) 16ms
 ✓ tests/unit_status_matrix.test.ts (35 tests) 41ms
 ✓ tests/watch_headless.test.ts (4 tests) 3ms
 ✓ tests/schema.test.ts (7 tests) 5ms

 Test Files  14 passed (14)
      Tests  96 passed (96)
   Start at  22:25:41
   Duration  760ms (transform 764ms, setup 0ms, collect 2.64s, tests 154ms, environment 2ms, prepare 1.23s)
```

**Targeted S3 files (re-run):**

```
 ✓ packages/core/tests/scenario_json_load.test.ts (3 tests) 5ms
 ✓ packages/core/tests/critic_s1_s2.test.ts (8 tests) 11ms

 Test Files  2 passed (2)
      Tests  11 passed (11)
```

---

## Per-finding ledger for integrator / CRITIC_ROUNDS

| ID | FIXED / OPEN | One-line proof |
|----|--------------|----------------|
| S3-1 | **FIXED** | Soft launder fixture green; runtime emits `SOFT_STATUS_QUERY_LATE` |
| S3-2 | **FIXED** | Doctrine §force-clear + dirty-close→AVL + note fixture green |
| S3-3 | **FIXED** | Instance `idSeq`; interleave A/B grades independent (`gr_2`/`gr_4`) green |
| S3-4 | **FIXED** | `scenario_json_load.test.ts` 3/3 reads + Zod spine on both scenario.json |
| S3-5 | **OPEN** | Table **93** ≠ suite **96** |

Builder agents do not self-close. This document is the separate acceptance run for S3 batch.
