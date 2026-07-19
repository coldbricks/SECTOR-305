# REFUTE_S2 — VERIFIER-S2-SAFETYHATCH + VERIFIER-S2-ORPHANS

**Agents:** VERIFIER-S2-SAFETYHATCH and VERIFIER-S2-ORPHANS (combined report only; findings treated separately below)  
**Wave:** WAVE_2026-07-18_r2  
**Role:** Independent refuter / acceptance runner (ORCHESTRATOR_PRIME §3.4 — not the fix authors)  
**Date:** 2026-07-18  
**Product code:** read-only. This file is the only write.

**Source findings:** `docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md`  
**Fix staging read:** `docs/waves/staging/RUNTIME_SERIAL.md` (SAFETYHATCH), `docs/waves/staging/S2_ORPHANS.md` (ORPHANS)

---

## Command run (both findings)

```
cd C:\Users\coldb\SECTOR-305
npm test -- tests/critic_s1_s2.test.ts tests/orphan_codes.test.ts
```

### Pasted output (green)

```
> sector-305@0.1.0 test
> npm run test -w @sector305/core tests/critic_s1_s2.test.ts tests/orphan_codes.test.ts


> @sector305/core@0.1.0 test
> vitest run tests/critic_s1_s2.test.ts tests/orphan_codes.test.ts


 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/orphan_codes.test.ts (2 tests) 18ms
 ✓ tests/critic_s1_s2.test.ts (8 tests) 14ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Start at  22:25:32
   Duration  629ms (transform 118ms, setup 0ms, collect 335ms, tests 33ms, environment 0ms, prepare 132ms)
```

---

## FINDING S2-SAFETYHATCH — status: **FIXED**

### Critic claim (restated)

`FAIL_SAFETY_NOT_AIRED` only ran when the player supplied `radioCaption`. Omitting the caption used `formatDispatch()` (no weapons element) and **skipped** the safety check — silence outgraded an explicit wrong caption.

### Acceptance (falsifiable)

Weapons-flagged CFS dispatched with no `radioCaption` → either caption contains a weapons element, **or** hard fail emitted. (Doctrine may pick either path.)

### Evidence checked (file:line)

| Item | Location | Observation |
|------|----------|-------------|
| Effective caption built first | `packages/core/src/runtime.ts` ~762–790 | Caption resolved from player or auto; safety grades that string |
| Weapons knowable gate | same, `weaponsKnowable` + `// TRUTH-GATE-OK(dispatch-safety)` | Player `WEAPONS` flag or knowable truth |
| Explicit omit of weapons token | `!radioCaption` false branch | `FAIL_SAFETY_NOT_AIRED` |
| Silence path | `!radioCaption` true branch | appends `, weapon reported` — not a silent skip |
| House law | `docs/DOCTRINE.md` §Radio | Dual path documented (fail vs auto-append) |
| Fixture A | `packages/core/tests/critic_s1_s2.test.ts` ~58–84 | Explicit caption without weapons → hard fail |
| Fixture B | same file ~87–113 | Omitted caption → `/weapon/` in radio log; no hard fail |

### Acceptance suite slice

From the pasted run above, `critic_s1_s2.test.ts` (8 tests) **passed**, including both S2-SAFETYHATCH cases:

- `weapons knowable + explicit caption without weapons → FAIL_SAFETY_NOT_AIRED`
- `weapons knowable + omitted radioCaption → auto-caption includes weapon (not silent skip)`

### Disposition

**FIXED.** Falsifiable acceptance is met: omission no longer bypasses safety grading. Explicit wrong caption still hard-fails. Doctrine sentence present.

No reopen. Residual none on acceptance criteria (doctrine dual-path is now explicit; earlier REFUTE residual about thin doctrine is closed by `DOCTRINE.md` §Radio safety-airing paragraph).

---

## FINDING S2-ORPHANS — status: **FIXED**

### Critic claim (restated)

Many hard/soft codes existed only as vocabulary; M02a “no orphan codes” was false. Length-only kill-list guards cannot detect silent orphans.

### Acceptance (falsifiable)

Automated orphan guard: for every code in `FAIL_CODES ∪ SOFT_CODES`, either ≥1 fixture produces it in a `gradeLog`, **or** it appears in a written amend/defer table with a phase tag. Guard fails on any silent orphan.

### Evidence checked (file:line)

| Item | Location | Observation |
|------|----------|-------------|
| Guard predicate | `packages/core/tests/orphan_codes.test.ts` `missingOrphans` + suite | `(FAIL ∪ SOFT) − emitted − DEFERRED` must be `[]` |
| DEFERRED table | same file `DEFERRED_CODES` | Phase-tagged amend/defer rows (incl. `FAIL_INFOSET_VIOLATION`, narrative/readback, many softs) |
| Emission harvest | `collectEmitted()` fixtures | Live hard paths for critic-named orphans that are not deferred (jurisdiction, wrong type, channel abandon, status stale, reclass no radio, etc.) |
| Green guard | test: “every FAIL_ and SOFT_ is emitted … OR deferred” | Passed in pasted run |
| In-test mutation | test: “guard fails on silent orphan…” | Passed in pasted run (see mutation note) |

### Acceptance suite slice

From the pasted run above, `orphan_codes.test.ts` (2 tests) **passed**:

1. Full vocabulary coverage (emit OR defer).
2. Mutation-style assertions that the guard is non-vacuous.

### Mutation note (orphan guard — §3.2)

Predicate under test:

```
missing = (FAIL_CODES ∪ SOFT_CODES) − emitted − keys(DEFERRED_CODES)
expect(missing).toEqual([])
```

**Documented / asserted mutations** (inside `orphan_codes.test.ts`, second test — not prose-only):

| Mutation | Expected | Asserted |
|----------|----------|----------|
| **A.** Strip one live emission (`FAIL_JURISDICTION`), leave `DEFERRED_CODES` unchanged | `missing` contains `FAIL_JURISDICTION` | `toContain("FAIL_JURISDICTION")` |
| **B.** Empty DEFERRED **and** strip emission(s) | Guard surfaces stripped live codes **and** formerly deferred-only codes | Contains `FAIL_JURISDICTION`, `FAIL_STATUS_STALE`, `FAIL_INFOSET_VIOLATION`, `SOFT_BOLO_INCOMPLETE` |

**If DEFERRED is empty and emission is stripped, the guard fails.** Vacuous green (vocabulary-only lists, empty defer table with no emitters) cannot survive this pair of mutations. Phase tags on deferred rows are also required non-empty.

### Disposition

**FIXED** under the critic’s allowed dual branch (wire emit + fixture **or** phase-tagged defer). Silent orphans are not present.

**Honesty residual (does not reopen under stated acceptance):** many soft codes remain phase-deferred rather than behaviorally live. That is an allowed amend/defer path, not a silent orphan. Phase-1 work can promote deferred rows to emitters without reopening S2-ORPHANS acceptance as written.

---

## Summary table (separate findings)

| Finding | Severity | Disposition | Suite evidence |
|---------|----------|-------------|----------------|
| **S2-SAFETYHATCH** | S2 | **FIXED** | `critic_s1_s2.test.ts` green (both safety cases) |
| **S2-ORPHANS** | S2 | **FIXED** | `orphan_codes.test.ts` green + in-test mutation (empty DEFERRED + strip emission → fail) |

**Combined command:** 2 files, 10 tests, all passed (output pasted above).

**Not claimed here:** full-repo `npm test` green (integrator); other S0/S1/S3 findings.

---

## Hand-off

- Orchestrator may record both S2 findings closed on this verifier paste + statuses.
- Closure is **not** self-declared by FIX authors (PRIME §3.4).
- Optional further §3.2 theater (delete a real DEFERRED row on disk and re-run red/restore) is redundant with the in-test mutation B already green; not required for acceptance.
