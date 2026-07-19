# External critic round — Claude (anti-cheap contract engineer)

**Date:** 2026-07-18
**Reviewer:** Claude (Fable 5) — external to the build swarm; read-only pass + independent test execution
**Scope:** Full repo at fan-out state (~69 tests green at review time; tree was actively growing during review)
**Protocol:** These findings enter the M20 critic loop as external input. Per contract, each finding must be FIXED or REFUTED with evidence before a zero-finding round may be claimed. "Could be deeper" is not a finding; every item below is falsifiable.

---

## Attested genuine (verified by execution, not read)

Fairness first — the following claims were independently verified and are REAL:

- `npm test` → 69/69 green, run by reviewer, 519ms.
- Sacred invariant (M08): double headless replay with sorted hard-multiset comparison is genuinely implemented and tested. No `Date.now()` in reducers. Seeded RNG present.
- 64-cell status matrix (M01b) enumerated and tested including illegal edges.
- Kill-list guards (M17) are executable tests, not prose: credential-phrase grep, STT-import ban, no-miami-branch grep all real.
- Closed PlayerCommand union with `never` exhaustiveness check (M03h) real.
- COVERAGE_TABLE honesty block and CRITIC_ROUNDS open-findings log: unusually honest for an agent swarm. Keep this discipline.

---

## FINDING S0-GIT — repository is not under version control (OPERATIONAL EMERGENCY)

**Severity:** S0 — blocks everything; fix before the next agent wave writes another file.
**Evidence:** `git log` at repo root → `fatal: not a git repository`. Meanwhile `.github/workflows/ci.yml` exists (can never run), and M10 requires "golden files … committed to git" (impossible), and M09 acceptance requires a "grep gate in CI" (never executed).
**Consequence:** ~11k authored lines with zero undo. One bad agent wave = unrecoverable loss. Every CI-based acceptance row in the coverage table is currently unearned.
**Required fix:** `git init` + full initial commit immediately. Then: one commit per agent wave minimum, message = wave/manifest IDs touched.
**Acceptance (falsifiable):** `git log --oneline` shows ≥1 commit containing all current artifacts; subsequent waves each add ≥1 commit; CI workflow runs green on a remote or `act`-equivalent, or the coverage table stops citing CI as evidence.

---

## FINDING S1-PSYCHIC — golden sessions act on facts before they are knowable (C10 violation in flagship checkride)

**Severity:** S1 — the flagship checkride's goldens encode clairvoyance; pedagogy and fairness law both broken.
**Evidence:**
- M04 binding narrative + `EXPECTED.md`: weapons/knife cue knowable at **t=15000**, location correction "1400 Ocean" at **t=25000**.
- Golden **pass** path (`sacred_invariant.test.ts` `passCommands()`): `VerifyLocation` with the exact truth address `1400 block Ocean Drive` at **t=2000** — 23 s before the caller provides it. Reclass to ROBBERY-IP/P1 at t=3000–3500 — 12 s before the knife cue.
- Golden **fail** path: `FAIL_PRIORITY_UNDERCODE` and `FAIL_NO_VERIFY` fire at dispatch **t=2000**, pre-cue.
- Root cause admitted in `packages/core/src/fixtures.ts` (truth block comment): *"Empty schedule = truth immediately knowable (fail demos / pass reclass)"* — the checkride fixture ships with no `knowableSchedule`, bypassing the info-set engine (M11) that exists precisely for this.
**Consequence:** A player following doctrine in real time cannot reproduce the golden pass. The fail session punishes triage decisions made before the distinguishing information existed. This is the exact failure mode C10 + M01a "information-set fairness" were written to prevent.
**Required fix:** Author `knowableSchedule` into the checkride truth (weapons/nature facet @15000, location facet @25000 per M04 table). Re-time both golden sessions so every player action postdates its enabling cue. Fail path should fail for what a real evaluator fails: not upgrading/re-dispatching **after** the cue.
**Acceptance (falsifiable):** New automated test scans each golden SessionRecord against the scenario's knowableSchedule and asserts no command uses a truth-derived fact (address block, weapons flag, P1 reclass) before its `becomesKnowableAtMs`. Fail multiset still contains the sacred three; grade timestamps all ≥ the enabling cue time.

---

## FINDING S1-VACUOUS — a sacred-invariant test cannot fail

**Severity:** S1 — green paint on the contract's most sacred surface.
**Evidence:** `sacred_invariant.test.ts`, third test ("committed session_fail.json matches runtime multiset when present"): the entire body — including all `expect(...)` calls — is wrapped in `try { … } catch { expect(true).toBe(true); }`. A failing assertion throws, is caught, and the test passes. It is structurally impossible for this test to fail.
**Consequence:** The only test that binds `scenarios/checkride_a07_ocean_robbery_v1/session_fail.json` (an M04 contract artifact) to the runtime is vacuous. M04's coverage-table row is therefore overstated: the committed session JSONs are currently decorative.
**Required fix:** Delete the try/catch. If file absence must be tolerated during a wave, guard with `existsSync` and **fail hard** on parse error or multiset mismatch.
**Acceptance (falsifiable):** Corrupting one command in `session_fail.json` makes `npm test` fail. Same treatment for `session_pass.json`.

---

## FINDING S1-TRUTHLEAK — dispatch path grades from hidden truth without the knowable gate

**Severity:** S1 — grader bug class the manifest itself names (`FAIL_INFOSET_VIOLATION`, M02a #21: "grader bug guard — should never fire on player").
**Evidence (`packages/core/src/runtime.ts`, `dispatchUnits`):
- Undercode-at-dispatch check reads `inc.truth.weapons || inc.truth.inProgress || rank(truth) <= 1` directly — does NOT call `isHighAcuityKnowable()`. Contrast `setPriority`, which gates correctly.
- Verify gate: `highAcuity = rank(inc.priority) <= 1 || rank(inc.truth.actualPriority) <= 1` — hidden truth raises the bar on a CFS presented as P3/P4.
- Readback requirement: `requiresReadback: rank(inc.priority) <= 1 || rank(inc.truth.actualPriority) <= 1` — protocol obligations assigned from facts the player cannot see. (The inline comment "undercode cannot dodge protocol" is a defensible doctrine **post-cue**; pre-cue it is an info-set violation.)
**Required fix:** Route every dispatch-time acuity decision through `isHighAcuityKnowable()` (or an equivalent knowable-set query). If house law wants "truth acuity binds protocol regardless," that is a written amend to M01a — not an unstated code path.
**Acceptance (falsifiable):** New C10 fixtures: (a) dispatch pre-cue at presented priority → zero hard fails from this path (soft allowed); (b) identical dispatch post-cue → `FAIL_PRIORITY_UNDERCODE` (and verify gate + readback apply). Both replay deterministically.

---

## FINDING S2-SAFETYHATCH — weapons-not-aired check skippable by omitting the caption

**Severity:** S2 — real grading hole in a safety-critical rule.
**Evidence (`runtime.ts`, `dispatchUnits`):** `FAIL_SAFETY_NOT_AIRED` fires only inside `if ((truth.weapons || flags WEAPONS) && radioCaption && !/weapon|gun|knife|armed/i…)`. When the player omits `radioCaption`, the auto-caption from `formatDispatch()` (callsigns + priority + nature + location, **no weapons element**) is used and the safety check never runs.
**Consequence:** The player who airs nothing outgrades the player who airs the wrong thing. Kill-list-adjacent (press-to-win by silence).
**Required fix:** Grade the **final effective caption** regardless of source. Either the auto-caption must include a safety element when WEAPONS is knowable (then test that it does), or omission grades `FAIL_SAFETY_NOT_AIRED` — pick one doctrine, write it in DOCTRINE.md §Radio.
**Acceptance (falsifiable):** Test: weapons-flagged CFS dispatched with no `radioCaption` → either caption contains weapons element, or hard fail emitted. Currently neither happens.

---

## FINDING S2-ORPHANS — 7 of 24 hard codes and 12 of 15 soft codes are never emitted

**Severity:** S2 — numeric floor met on paper, not in the engine; M02a acceptance ("no orphan codes") currently false.
**Evidence:** grep of `code:` emissions across `packages/core/src`. Emitted hard codes: 17 (incl. dynamic `FAIL_RADIO_FORMAT`). Never emitted:
`FAIL_UNIT_WRONG_TYPE`, `FAIL_STATUS_STALE`, `FAIL_NARRATIVE_MISSING_CRITICAL`, `FAIL_JURISDICTION`, `FAIL_CHANNEL_ABANDON`, `FAIL_READBACK_WRONG`, `FAIL_RECLASS_NO_RADIO`. (`FAIL_INFOSET_VIOLATION` test-only is by design — exempt.)
Soft codes emitted: `SOFT_PRIORITY_LOW`, `SOFT_DOWNGRADE_WHILE_ROLLING`, `SOFT_RADIO_FORMAT` only. The other 12 are vocabulary without behavior.
Note: `kill_list_guards.test.ts` checks **list length** (≥24/≥15), so this cannot self-detect. Note also: the new Friday-night watch injects a Z-PORT jurisdiction edge (C7 hook) — with `FAIL_JURISDICTION` orphaned, that edge is data-only theater.
**Required fix:** For each orphan: wire emitting logic + a fixture that fires it, OR shrink the vocabulary via the manifest amend protocol with a phase tag. No third option.
**Acceptance (falsifiable):** Automated orphan guard: for every code in `FAIL_CODES ∪ SOFT_CODES`, either ≥1 test fixture produces it in a gradeLog, or it appears in a written amend table with a deferral phase. Guard fails on any silent orphan.

---

## FINDING S3 (minor, batch)

1. **Status laundering:** `unitRadioRx` auto-promotes DIS → ER → OS on "on scene" phrasing with no mark. A skipped ER call is a status-hygiene miss in any real room; at minimum emit a soft mark (`SOFT_STATUS_QUERY_LATE` exists, unused). Acceptance: fixture where unit jumps DIS→"on scene" yields a soft mark.
2. **Silent auto-correct on close:** `clearIncident` grades dirty-close, then force-sets all units AVL bypassing the transition matrix. Borders kill-list #16 ("auto-correct everything"). Either document "close = forced clear" as house law or route through legal transitions. Acceptance: doctrine sentence + test either way.
3. **Module-global `idSeq`:** reset in the constructor but shared across Runtime instances in one process (UI + replay concurrently interleaves IDs). Not graded today, but it is a determinism landmine. Make it instance state. Acceptance: two interleaved Runtimes produce the same IDs as two sequential ones.
4. **scenario.json not consumed:** runtime tests build from `fixtures.ts`; the committed `scenario.json` files are not loaded by any code path (external loader is next-build-order — fine, but M04's coverage row should not imply the JSON is exercised until it is).
5. **Doc drift:** COVERAGE_TABLE cites 62/62; suite is 69/69. Refresh at Round 2 close.

---

## Round-2 gate impact

Per M20, Phase 0 close requires two consecutive zero-finding rounds. This external round contributes: **1×S0, 3×S1, 2×S2, 5×S3**. S0-GIT is not a critic finding so much as a stop-work condition: no further waves should write files into an unversioned tree.

*Filed read-only; reviewer modified no existing artifacts. This file is the only addition.*
