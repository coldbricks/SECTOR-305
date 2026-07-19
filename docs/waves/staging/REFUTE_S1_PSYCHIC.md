# REFUTE — S1-PSYCHIC / FAIRNESS-AUDIT (VERIFIER-S1-PSYCHIC)

**Wave:** WAVE_2026-07-18_r2  
**Agent:** VERIFIER-S1-PSYCHIC / FAIRNESS-AUDIT  
**Finding:** S1-PSYCHIC — golden sessions act on facts before they are knowable  
**Source:** `docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md`  
**PRIME:** Read `docs/ORCHESTRATOR_PRIME.md` §3.4 (no self-closure), §4.2 (goldens humanly playable)  
**Role:** Refute if goldens still clairvoyant. Do not close on builder claims alone.

---

## Verdict: **FIXED**

Goldens are **not** clairvoyant. Every truth-derived pass command postdates its enabling cue. Fail dispatch is post-cue. Automated `psychic_guard` + `checkride` suites green on re-run.

---

## Cue schedule (source of truth)

**File:** `packages/core/src/fixtures.ts` — `incidentRobberyBadAddress().truth.knowableSchedule`

| Facet | becomesKnowableAtMs (`atMs`) | Summary |
|-------|------------------------------|---------|
| `weapons` | **15000** | Caller says someone took a bag, maybe a knife |
| `nature` | **15000** | Sounds like robbery in progress |
| `priority` | **15000** | Elevate — weapons/IP cues |
| `location` | **25000** | Caller thinks 1400 Ocean Drive |

Empty-schedule “immediately knowable” path is **gone** for this flagship CFS.

---

## Pass path — each truth-derived command vs cue

Sources (must match; both scanned):

- In-memory: `packages/core/tests/checkride_sessions.ts` → `passCommands()`
- Committed: `scenarios/checkride_a07_ocean_robbery_v1/session_pass.json`

| Command | Fact(s) | `atMs` | Enabling cue | Cue ms | `atMs − cue` | Clairvoyant? |
|---------|---------|--------|--------------|--------|--------------|--------------|
| `SetNature` `ROBBERY-IP` | nature | **17000** | nature | 15000 | +2000 | **No** |
| `SetPriority` `P1` | priority | **17500** | priority | 15000 | +2500 | **No** |
| `SetFlag` `WEAPONS=true` | weapons | **18000** | weapons | 15000 | +3000 | **No** |
| `VerifyLocation` freeform/block **1400** Ocean Drive | location | **27000** | location | 25000 | +2000 | **No** |
| `DispatchUnits` caption contains **1400** + robbery + weapon | location + weapons/nature | **28000** | max(location, weapons) | 25000 | +3000 | **No** |

Non-truth-derived steps (not fairness-gated by C10 address/weapons/P1 rule, listed for completeness):

| Command | `atMs` | Notes |
|---------|--------|-------|
| `AddNote` “Holding for better location” | 1000 | Pre-cue OK — no truth fact |
| `SetFlag` `NEEDS_BACKUP=true` | 18500 | After weapons/nature cue; no separate backup facet on schedule |
| Unit radio ACK/STATUS, CLR/AVL, ClearIncident | 30000–51000 | Post-dispatch procedural |

**Contrast to critic evidence (pre-fix):** pass had `VerifyLocation` 1400 @ **2000** and ROBBERY-IP/P1 @ **3000–3500**. Those timings are **eliminated**.

---

## Fail path — dispatch `atMs`

Sources:

- In-memory: `failCommands()` in `checkride_sessions.ts`
- Committed: `scenarios/checkride_a07_ocean_robbery_v1/session_fail.json`

| Step | `atMs` | Content | vs weapons cue (15000) | vs location cue (25000) |
|------|--------|---------|------------------------|-------------------------|
| `AddNote` | 2000 | “Monitoring loud disturbance” | pre-cue, no truth | pre-cue, no truth |
| **`DispatchUnits`** | **27000** | one unit, radioCaption `3A12, P3 disturbance, beach area` | **≥ 15000** (+12000) | **≥ 25000** (+2000) |
| `NoOp` | 80000 | open readback window (dispatch+45s due @72s) | post | post |

Fail dispatch does **not** air weapons, robbery, or block 1400 — it undercodes **after** acuity is knowable. Critic requirement: fail for not upgrading/re-dispatching **after** the cue — **met**.

Runtime hard-fail timestamps (from `psychic_guard` / checkride; grades at dispatch clock):

| Code | Observed `atMs` | ≥ weapons cue? |
|------|-----------------|----------------|
| `FAIL_PRIORITY_UNDERCODE` | 27000 | yes |
| `FAIL_NO_VERIFY` | 27000 | yes |
| `FAIL_NO_BACKUP` | 27000 | yes |
| `FAIL_SAFETY_NOT_AIRED` | 27000 | yes |
| `FAIL_NO_READBACK` | 80000 | yes |

Sacred three present: `FAIL_NO_VERIFY`, `FAIL_PRIORITY_UNDERCODE`, `FAIL_NO_READBACK`.

---

## Guard coverage (acceptance text)

Critic acceptance: *automated test scans each golden SessionRecord against knowableSchedule; no truth-derived command before cue; fail multiset sacred three; grade timestamps ≥ enabling cue.*

| Check | Where | Status |
|-------|-------|--------|
| Schedule shape 15s / 25s | `psychic_guard` schedule test | pass |
| In-memory pass no clairvoyance | `assertNoClairvoyance(passCommands())` | pass |
| In-memory fail dispatch ≥ weapons cue | `failCommands` filter DispatchUnits | pass |
| Committed `session_pass.json` scan | same assert | pass |
| Committed `session_fail.json` dispatch ≥ weapons cue | same | pass (see race note) |
| Fail grade `atMs` ≥ weapons cue + sacred three | runtime debrief in psychic_guard | pass |
| PASS/FAIL behavioral goldens | `checkride.test.ts` | pass |

---

## npm test output (pasted)

**Command:**

```
cd C:\Users\coldb\SECTOR-305
npm test -- tests/psychic_guard.test.ts tests/checkride.test.ts
```

(equivalent: `cd packages/core; npx vitest run tests/psychic_guard.test.ts tests/checkride.test.ts --reporter=verbose`)

### Run 1 — flake on committed fail (race / transient empty dispatch multiset)

```
 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/checkride.test.ts (3 tests) 6ms

 ❯ tests/psychic_guard.test.ts (6 tests | 1 failed) 10ms
   ✓ fixture knowableSchedule: weapons/nature/priority @15000, location @25000
   ✓ in-memory passCommands never use truth before cue
   ✓ in-memory failCommands dispatch only after weapons cue
   ✓ committed session_pass.json never uses truth before cue
   × committed session_fail.json dispatch only after weapons cue
     → expected 0 to be greater than 0
   ✓ fail runtime hard-fails (undercode/verify/backup/safety) atMs >= weapons cue

 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 8 passed (9)
```

**Interpretation:** Assertion was `dispatches.length > 0` on disk JSON. On-disk file at audit time **does** contain `DispatchUnits` @27000 (read full). Failure is consistent with S1-VACUOUS mutation rewriting `session_fail.json` in place mid-wave (noted in `S1_PSYCHIC.md` integrator notes) — **not** residual clairvoyance. Re-read of `session_fail.json` after flake showed full fail golden intact.

### Run 2 — clean green (binding for this refute)

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
   Start at  22:25:59
   Duration  523ms (transform 96ms, setup 0ms, collect 289ms, tests 13ms, environment 0ms, prepare 113ms)
```

---

## Adversarial checks performed (why not STILL OPEN)

1. **Full file read** of fixtures schedule, both session builders, both committed JSONs, psychic_guard, checkride tests — not sample/summary.
2. **Line-by-line** comparison of every 1400 / ROBBERY-IP / P1 / WEAPONS use against cue ms (table above).
3. **Fail path** re-checked for pre-cue undercode punishment: dispatch and grades are @27000, not @2000.
4. **In-memory ↔ disk parity:** pass/fail command timelines match between `checkride_sessions.ts` and `session_*.json`.
5. **Could not refute** the fix: no remaining pre-cue truth command in goldens.

### Residual (does **not** reopen S1-PSYCHIC)

- Concurrent suite flake when S1-VACUOUS mutates `session_fail.json` on disk — process/CI hygiene, not C10 fairness.
- `SetFlag NEEDS_BACKUP` has no dedicated schedule facet; timed after weapons/nature cue (reasonable for Phase 0).

---

## Disposition

| Field | Value |
|-------|-------|
| **Status** | **FIXED** |
| **STILL OPEN?** | No |
| **Closure basis** | Independent fairness audit: schedule + re-timed goldens + green psychic/checkride; no clairvoyant command found |
| **Builder self-closure** | Rejected per PRIME §3.4 — this file is the separate verifier artifact |
