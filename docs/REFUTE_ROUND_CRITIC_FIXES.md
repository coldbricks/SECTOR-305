# REFUTE round — orchestrator claim

**Claim under attack:** *All findings in `docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md` are FIXED with falsifiable acceptance.*

**Date:** 2026-07-18  
**Agent:** REFUTE (read + execute; prefer REFUTE when uncertain)  
**Tree reviewed:** working tree at `C:\Users\coldb\SECTOR-305` (git HEAD `5fc52a6` + large dirty fix wave)  
**Protocol:** each external finding scored **FIXED** / **PARTIAL** / **STILL OPEN** with file:line evidence. Soft-pedal forbidden.

---

## Verdict (headline)

| Severity | Count FIXED | Count PARTIAL | Count STILL OPEN |
|----------|-------------|---------------|------------------|
| S0 | 0 | 1 | 0 |
| S1 | 2 | 1 | 0 |
| S2 | 2 | 0 | 0 |
| S3 | 1 | 2 | 2 |

**Orchestrator claim is FALSE.**  
Several code-path findings are substantially addressed in the **working tree**, but falsifiable acceptance is incomplete on S0, S1-VACUOUS, and multiple S3 items. Uncommitted state also means HEAD still carries the original psychic fixture and vacuous try/catch.

**Can zero-finding round be claimed? → NO**

---

## Per-finding disposition

### S0-GIT — repository not under version control → **PARTIAL**

| Critic acceptance element | Observed |
|---------------------------|----------|
| `git init` + ≥1 commit | **Met:** `git log --oneline` → `5fc52a6 S0-GIT: initial commit — Phase 0 instrument tree` |
| Commit contains **all current artifacts** | **Not met:** large dirty wave; critic-fix artifacts uncommitted or modified |
| Subsequent waves each add ≥1 commit | **Not met:** fix wave has **zero** additional commits |
| CI green on remote/`act`, **or** coverage stops citing CI | **Not met as proven:** workflow exists (`.github/workflows/ci.yml`) but no remote run / `act` evidence produced this round; table barely mentions CI only as soft residual |

**Evidence (working tree dirty after sole commit):**

```
## master
 M packages/core/src/fixtures.ts
 M packages/core/src/runtime.ts
 M packages/core/tests/sacred_invariant.test.ts
 M scenarios/checkride_a07_ocean_robbery_v1/session_fail.json
 M scenarios/checkride_a07_ocean_robbery_v1/session_pass.json
?? packages/core/tests/checkride_sessions.ts
?? packages/core/tests/critic_s1_s2.test.ts
?? packages/core/tests/orphan_codes.test.ts
?? packages/core/tests/psychic_guard.test.ts
… (and more)
```

**HEAD still has the pre-fix psychic authoring comment (no `knowableSchedule` array):**

- `git show HEAD:packages/core/src/fixtures.ts` — still: *“Empty schedule = truth immediately knowable (fail demos / pass reclass)”* with **no** schedule entries.

**HEAD still has the vacuous try/catch** in sacred invariant (see S1-VACUOUS).

**Refute note:** S0 was an operational stop-work condition whose acceptance is multi-part. Emergency “not a git repo” is gone; **falsifiable acceptance is not fully satisfied**. Prefer PARTIAL over FIXED.

---

### S1-PSYCHIC — golden sessions act before knowable → **FIXED** (working tree)

**Required fix evidence:**

| Item | Location |
|------|----------|
| `knowableSchedule` on checkride truth | `packages/core/src/fixtures.ts:92–113` — weapons/nature/priority @15000, location @25000 |
| Fail path post-cue only | `packages/core/tests/checkride_sessions.ts:3–21` — dispatch @27000 after Advance 26000 |
| Pass path post-cue verify/reclass | `packages/core/tests/checkride_sessions.ts:25–120` — nature/P1/weapons @≥17000; VerifyLocation @27000 with 1400 Ocean |
| Psychic guard tests | `packages/core/tests/psychic_guard.test.ts` (4 tests) |
| Grade timestamps ≥ cue | `packages/core/tests/sacred_invariant.test.ts:109–120`; `packages/core/tests/checkride.test.ts:31–39` |

**Acceptance status:** automated guard + schedule fixture + post-cue fail multiset (sacred three + backup) all green under `npm test`.

**Minor residual (not reopening to STILL OPEN):** guard hardcodes `LOCATION_CUE_MS=25000` / `WEAPONS_CUE_MS=15000` rather than reading `knowableSchedule` facet-by-facet from the SessionRecord. Spirit of C10 acceptance is met; pure text of “scan SessionRecord against knowableSchedule” is only partially mirrored.

---

### S1-VACUOUS — sacred-invariant test cannot fail → **PARTIAL**

**What improved:**

- try/catch / `expect(true).toBe(true)` removed from working-tree `sacred_invariant.test.ts`.
- New tests titled as vacuous fix + mutation: `packages/core/tests/sacred_invariant.test.ts:155–213`.

**Why not FIXED — falsifiable acceptance fails:**

Critic acceptance: *“Corrupting one command in `session_fail.json` makes `npm test` fail.”*  
*Same treatment for `session_pass.json`.*

** empirically refuted:**

1. The “committed bind” test **rewrites the golden before reading it**:

```155:158:packages/core/tests/sacred_invariant.test.ts
  it("committed session_fail.json is bound (no vacuous catch) — S1-VACUOUS fix", () => {
    writeSessionFiles();
    expect(existsSync(failPath)).toBe(true);
```

`writeSessionFiles()` (`:33–55`) always regenerates JSON from `failCommands()` / `passCommands()`.

2. **Execution proof (this REFUTE pass):**
   - Wrote a corrupted one-command `session_fail.json` (NoOp only).
   - Ran: `vitest run tests/sacred_invariant.test.ts -t "committed session_fail"`.
   - **Result: PASS** (1 passed).
   - File was rewritten to the full post-cue fail script (dispatch @27000 restored).

Therefore: corrupting the committed artifact **does not** make the suite fail. The committed M04 JSON remains non-authoritative; TypeScript session builders are the real goldens. Original consequence (“committed session JSONs are decorative”) **still holds**.

3. No equivalent mutation / bind path for `session_pass.json` as required.

4. Mutation test (`:174–213`) proves *in-process* that a NoOp command list fails `includesAllHard` — useful, but **not** the stated acceptance (npm red on corrupt committed file).

**HEAD still vacuous:** `git show HEAD:…/sacred_invariant.test.ts` still wraps expects in `try { … } catch { expect(true).toBe(true); }`.

---

### S1-TRUTHLEAK — dispatch grades from hidden truth → **FIXED** (working tree)

**Code path (dispatchUnits):**

| Gate | Evidence |
|------|----------|
| Undercode at dispatch | `runtime.ts:577–594` — gated by `this.isHighAcuityKnowable(inc)` |
| Verify gate highAcuity | `runtime.ts:596–598` — `priorityRank(inc.priority) <= 1 \|\| this.isHighAcuityKnowable(inc)` (no raw `truth.actualPriority` alone) |
| Readback requirement | `runtime.ts:796–798` — same knowable gate |
| Backup | `runtime.ts:689–695` — knowable-gated; no pre-cue raw `truth.weapons` hard path |

**Acceptance fixtures:**

- Pre-cue: `packages/core/tests/critic_s1_s2.test.ts:12–32` — no `FAIL_PRIORITY_UNDERCODE` / `FAIL_NO_VERIFY`.
- Post-cue: `critic_s1_s2.test.ts:34–52` — undercode hard-fails.

**Note:** `isHighAcuityKnowable` still treats **empty schedule** as immediately knowable (`runtime.ts:467–474`) — legacy authoring path; checkride schedule is non-empty, so flagship path is fair.

---

### S2-SAFETYHATCH — omit caption skips safety grade → **FIXED** (working tree)

**Code:** `runtime.ts:754–782` — builds effective caption first; if weapons knowable and caption lacks weapons token:

- omitted `radioCaption` → appends `", weapon reported"` to auto-caption;
- explicit caption without weapons → `FAIL_SAFETY_NOT_AIRED`.

**Tests:** `critic_s1_s2.test.ts:55–113` — both branches asserted.

**Minor residual:** critic asked to pick one doctrine and write it in `DOCTRINE.md` §Radio. DOCTRINE lists “safety” as a dispatch element (`docs/DOCTRINE.md:48`) but does **not** document auto-append vs hard-fail-on-omit house law. Code+tests satisfy the falsifiable test acceptance; doctrine sentence is thin.

---

### S2-ORPHANS — codes never emitted → **FIXED** (working tree, via wire + defer table)

**Acceptance:** every `FAIL_` / `SOFT_` either emitted by a fixture **or** phase-tagged deferral.

**Evidence:**

- Guard: `packages/core/tests/orphan_codes.test.ts:632–641`.
- Defer table: `orphan_codes.test.ts:12–27` (`DEFERRED_CODES` with phase tags).
- Emitters wired in runtime for previously orphaned hard codes including: `FAIL_JURISDICTION` (`runtime.ts:711–728`), `FAIL_UNIT_WRONG_TYPE` (`:730–751`), `FAIL_CHANNEL_ABANDON` (`:255–276`), `FAIL_STATUS_STALE` (`:278–302`), `FAIL_RECLASS_NO_RADIO` (`:382–409`), plus soft status launder emission.

**Honesty residual (does not reopen finding under stated acceptance):** many soft codes remain **deferred** rather than behaviorally live. That is an allowed branch of the required fix, not silent orphans. M02a “no orphan codes” is satisfied only under the amend/defer reading.

---

### S3 batch

#### S3-1 Status laundering → **FIXED**

- Soft mark on DIS → “on scene”: `runtime.ts:1082–1098` emits `SOFT_STATUS_QUERY_LATE`.
- Fixture: `critic_s1_s2.test.ts:116–151`.

#### S3-2 Silent auto-correct on close → **PARTIAL**

- Code force-clear + comment: `runtime.ts:1349–1363`.
- Doctrine sentence: `docs/DOCTRINE.md:64–71` (working tree only; **absent from HEAD** DOCTRINE).
- Acceptance: *“doctrine sentence + test either way.”*
- **No test** in `packages/core/tests/**` asserts units become AVL after dirty close / force-clear (grep for force-clear / dirty-close AVL assertion: empty). Orphan harness #6 exercises `ClearIncident` while units assigned but only harvests grade codes, does not assert post-close unit status.

#### S3-3 Module-global `idSeq` → **PARTIAL**

- Implementation fixed: instance field `runtime.ts:46–52`, reset in constructor `:58`.
- Acceptance: *“two interleaved Runtimes produce the same IDs as two sequential ones.”*
- Test only compares **sequential** runs: `critic_s1_s2.test.ts:154–169` (`two sequential runtimes…`). **Does not interleave** two live instances. Code is almost certainly correct; acceptance test does not match the written check.

#### S3-4 `scenario.json` not consumed → **STILL OPEN**

- Grep of `packages/**` for `loadScenario` / `scenario.json` consumption: **no matches**.
- Runtime tests still build from `fixtures.ts` / in-memory injects.
- Critic allowed deferral of loader but required coverage honesty: M04 row still lists scenario JSON as artifact without “not loaded” caveat in `docs/COVERAGE_TABLE.md:19`.

#### S3-5 Doc drift test counts → **STILL OPEN**

- Critic: table cited 62/62 while suite was 69/69.
- Current: `docs/COVERAGE_TABLE.md:4` cites **`75/75`**; `docs/COVERAGE_TABLE.md:25` cites **`75 tests`**.
- This REFUTE execution: **`88/88`** passed.
- Drift is **not closed**; it was merely moved.

---

## New defects discovered this REFUTE pass

1. **Vacuous-bind rewrite (escalation of S1-VACUOUS):** `writeSessionFiles()` before “committed” assertions makes git goldens self-healing. M04 “committed session JSON” contract remains unenforced. *Proven by corrupt-then-green experiment above.*

2. **S0 + fix-wave integrity:** All material critic fixes live in an **uncommitted** working tree. HEAD still contains empty-schedule checkride truth and vacuous sacred test. A wipe/checkout of clean HEAD **reintroduces S1-PSYCHIC and S1-VACUOUS**. This is both an S0 acceptance miss and a recovery hazard.

3. **CRITIC_ROUNDS overclaim:** `docs/CRITIC_ROUNDS.md:25–42` already claims Round 3 zero hard findings and Phase 0 instrument exit **before** external ledger residuals are closed under this refute. That is process-honesty debt relative to M20 / external critic protocol.

4. **S2-SAFETYHATCH doctrine incomplete:** auto-append weapons on omitted caption is code house law without explicit DOCTRINE §Radio sentence describing the dual path (append vs hard-fail).

5. **S3-3 acceptance test mismatch:** interleave not tested (see above).

6. *(Optional observation, not graded as blocking here)* `FAIL_CHANNEL_ABANDON` (`runtime.ts:255–276`) fires whenever ≥2 high-acuity pending exist, without checking that the player “only worked lower” as the comment claims — possible over-fire / false pedagogy later.

---

## Command output — `npm test`

Shell: PowerShell (`cd C:\Users\coldb\SECTOR-305; npm test`)

```
> sector-305@0.1.0 test
> npm run test -w @sector305/core

> @sector305/core@0.1.0 test
> vitest run


 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/psychic_guard.test.ts (4 tests) 2ms
 ✓ tests/pack_validate.test.ts (4 tests) 6ms
 ✓ tests/kill_list_guards.test.ts (7 tests) 13ms
 ✓ tests/status.test.ts (4 tests) 2ms
 ✓ tests/infoset.test.ts (2 tests) 2ms
 ✓ tests/radio_protocol.test.ts (6 tests) 8ms
 ✓ tests/checkride.test.ts (3 tests) 8ms
 ✓ tests/critic_s1_s2.test.ts (6 tests) 9ms
 ✓ tests/orphan_codes.test.ts (2 tests) 16ms
 ✓ tests/watch_headless.test.ts (4 tests) 3ms
 ✓ tests/sacred_invariant.test.ts (4 tests) 23ms
 ✓ tests/unit_status_matrix.test.ts (35 tests) 41ms
 ✓ tests/schema.test.ts (7 tests) 5ms

 Test Files  13 passed (13)
      Tests  88 passed (88)
   Start at  22:15:22
   Duration  760ms (transform 661ms, setup 0ms, collect 2.43s, tests 139ms, environment 2ms, prepare 1.11s)
```

**Interpretation:** green suite proves working-tree code paths for many fixes; it does **not** prove every critic acceptance bullet, and green count **contradicts** COVERAGE_TABLE’s 75/75 claim.

### Targeted vacuous-acceptance experiment (additional)

```
# After corrupting scenarios/.../session_fail.json to a NoOp-only SessionRecord:
npx vitest run tests/sacred_invariant.test.ts -t "committed session_fail"
→ ✓ passed (1)
# File rewritten by writeSessionFiles() to full failCommands() content
```

---

## Summary table (quick scan)

| Finding | Disposition | One-line reason |
|---------|-------------|-----------------|
| S0-GIT | **PARTIAL** | Repo exists; current artifacts + wave commits + CI proof incomplete |
| S1-PSYCHIC | **FIXED** | Schedule + re-timed goldens + psychic_guard green |
| S1-VACUOUS | **PARTIAL** | try/catch gone, but `writeSessionFiles()` defeats committed-file acceptance |
| S1-TRUTHLEAK | **FIXED** | dispatch acuity via `isHighAcuityKnowable`; pre/post fixtures |
| S2-SAFETYHATCH | **FIXED** | effective caption graded / auto weapon append; tests green |
| S2-ORPHANS | **FIXED** | emit fixtures + DEFERRED_CODES phase table; guard green |
| S3-1 launder | **FIXED** | `SOFT_STATUS_QUERY_LATE` + fixture |
| S3-2 force-clear | **PARTIAL** | Doctrine sentence present; dedicated force-clear test missing |
| S3-3 idSeq | **PARTIAL** | Instance state fixed; interleave acceptance not tested |
| S3-4 scenario.json | **STILL OPEN** | Still not loaded by any package path |
| S3-5 doc counts | **STILL OPEN** | Table 75/75 vs actual 88/88 |

---

## Explicit gate statement

### Can zero-finding round be claimed?

# **NO**

**Reasons (non-exhaustive, each independently sufficient):**

1. S0 acceptance incomplete (uncommitted fix wave; sole commit does not hold all current artifacts).  
2. S1-VACUOUS acceptance empirically false (corrupt golden → suite still green).  
3. S3-4 and S3-5 still open.  
4. Multiple PARTIAL findings remain under the critic’s own falsifiable checks.

Orchestrator must not claim “all external findings FIXED with falsifiable acceptance.” Minimum remaining work before any zero-finding claim:

- Commit the fix wave (S0).  
- Make sacred tests **read** committed session JSON without rewrite; prove corrupt → red for fail **and** pass goldens (S1-VACUOUS).  
- Close S3-4 honesty and S3-5 count drift; finish S3-2 test and S3-3 interleave acceptance.  
- Then re-enter dual critic rounds with command evidence logged in `CRITIC_ROUNDS.md` (and retract premature Phase 0 exit language until residuals clear).

---

*Filed by REFUTE agent. Prefer REFUTE when uncertain — applied.*
