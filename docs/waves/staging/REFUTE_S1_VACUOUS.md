# REFUTE_S1_VACUOUS — VERIFIER-S1-VACUOUS

**Agent:** VERIFIER-S1-VACUOUS  
**Wave:** WAVE_2026-07-18_r2  
**Claim under attack:** S1-VACUOUS is fixed (author: AGENT-S1-VACUOUS / `docs/waves/staging/S1_VACUOUS.md`)  
**Disposition:** **FIXED** (refute attempt failed — claim holds under external mutation)

**Scope written:** this file only (+ temporary corrupt/restore of `session_fail.json`).  
**Author not trusted.** External mutation protocol run by this verifier, not the author.

---

## Critic original defect (what must not still be true)

From external critic: bind test body wrapped in `try { … } catch { expect(true).toBe(true); }` so assertions cannot fail; and/or bind rewrites the golden before reading it (self-healing).

**Acceptance (falsifiable):** Corrupting one command in `session_fail.json` makes `npm test -- tests/sacred_invariant.test.ts` fail. Restore → green.

---

## 1. Static read of `packages/core/tests/sacred_invariant.test.ts` (full)

File read in full (196 lines). Relevant findings:

| Check | Result |
|-------|--------|
| `try { expects } catch { expect(true).toBe(true) }` | **ABSENT** |
| `writeSessionFiles` call before bind | **ABSENT** (comment only) |
| Bind reads disk only | `readFileSync(failPath)` → `replayRecord` → bare `expect(includesAllHard(...)).toBe(true)` |
| In-test mutation | Corrupts DispatchUnits→NoOp; `try/finally` restores file only — does **not** catch assertion failures |
| Pass bind | Structural: length ≥ 8, contains `VerifyLocation` + `DispatchUnits`, empty hardFails |

Bind under test (lines 135–143):

```ts
it("committed session_fail.json is bound WITHOUT rewrite (S1-VACUOUS)", () => {
  expect(existsSync(failPath)).toBe(true);
  const record = JSON.parse(readFileSync(failPath, "utf8")) as SessionRecord;
  expect(record.commands.length).toBeGreaterThan(0);
  const { debrief } = replayRecord(pack, record);
  expect(includesAllHard(debrief.hardFails, [...FAIL_HARD_REQUIRED])).toBe(
    true
  );
});
```

`FAIL_HARD_REQUIRED` = `FAIL_NO_VERIFY`, `FAIL_PRIORITY_UNDERCODE`, `FAIL_NO_READBACK`.

Static analysis alone does not close S1-VACUOUS — mutation required (§3.2).

---

## 2. External mutation — CORRUPT

**File:** `scenarios/checkride_a07_ocean_robbery_v1/session_fail.json`  
**Change:** command at `atMs: 27000` — `DispatchUnits` → `NoOp` (valid JSON; no regenerate).

Original:

```json
{
  "atMs": 27000,
  "cmd": {
    "type": "DispatchUnits",
    "incidentId": "cfs-001",
    "unitIds": ["u-3a12"],
    "radioCaption": "3A12, P3 disturbance, beach area"
  }
}
```

Corrupted:

```json
{
  "atMs": 27000,
  "cmd": {
    "type": "NoOp"
  }
}
```

---

## 3. RED output (pasted)

```
$ cd C:\Users\coldb\SECTOR-305 ; npm test -- tests/sacred_invariant.test.ts

> sector-305@0.1.0 test
> npm run test -w @sector305/core tests/sacred_invariant.test.ts


> @sector305/core@0.1.0 test
> vitest run tests/sacred_invariant.test.ts


 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ❯ tests/sacred_invariant.test.ts (5 tests | 2 failed) 15ms
   ✓ M08 sacred invariant — SessionRecord headless replay > fail path: post-cue hard fails + double-replay identical 3ms
   ✓ M08 sacred invariant — SessionRecord headless replay > pass path: zero hard fails, double-replay empty multiset 3ms
   × M08 sacred invariant — SessionRecord headless replay > committed session_fail.json is bound WITHOUT rewrite (S1-VACUOUS) 4ms
     → expected false to be true // Object.is equality
   × M08 sacred invariant — SessionRecord headless replay > mutation: corrupt session_fail.json → includesAllHard false; restore → true 3ms
     → expected -1 to be greater than or equal to 0
   ✓ M08 sacred invariant — SessionRecord headless replay > committed session_pass.json bound without rewrite 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯


 Test Files  1 failed (1)
      Tests  2 failed | 3 passed (5)
   Start at  22:25:35
   Duration  537ms (transform 79ms, setup 0ms, collect 166ms, tests 15ms, environment 0ms, prepare 53ms)

 FAIL  tests/sacred_invariant.test.ts > M08 sacred invariant — SessionRecord headless replay > committed session_fail.json is bound WITHOUT rewrite (S1-VACUOUS)
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/sacred_invariant.test.ts:140:73
    138|     expect(record.commands.length).toBeGreaterThan(0);
    139|     const { debrief } = replayRecord(pack, record);
    140|     expect(includesAllHard(debrief.hardFails, [...FAIL_HARD_REQUIRED])…
       |                                                                         ^
    141|       true
    142|     );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/sacred_invariant.test.ts > M08 sacred invariant — SessionRecord headless replay > mutation: corrupt session_fail.json → includesAllHard false; restore → true
AssertionError: expected -1 to be greater than or equal to 0
 ❯ tests/sacred_invariant.test.ts:158:18
    156|       // Corrupt one command (DispatchUnits → NoOp), keep remaining st…
    157|       const di = rec.commands.findIndex((c) => c.cmd?.type === "Dispat…
    158|       expect(di).toBeGreaterThanOrEqual(0);
       |                  ^
    159|       rec.commands[di] = { atMs: rec.commands[di].atMs, cmd: { type: "…
    160|       writeFileSync(failPath, JSON.stringify(rec, null, 2) + "\n");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

npm error Lifecycle script `test` failed with error:
npm error code 1
...
EXIT 1
```

### RED interpretation

1. **Primary (S1-VACUOUS bind):** `includesAllHard(...)` returned `false` and the bare `expect(...).toBe(true)` **failed**. Corruption of the committed golden is detected. Not vacuous. Not self-healing.
2. **Secondary (in-test mutation helper):** failed because external corruption already removed `DispatchUnits`, so `findIndex` returned `-1`. Expected under pre-corrupted golden; not a vacuity path. Confirms the file on disk is what the suite reads.

---

## 4. RESTORE

```
$ git checkout -- scenarios/checkride_a07_ocean_robbery_v1/session_fail.json
```

---

## 5. GREEN output (pasted)

```
$ npm test -- tests/sacred_invariant.test.ts

> sector-305@0.1.0 test
> npm run test -w @sector305/core tests/sacred_invariant.test.ts


> @sector305/core@0.1.0 test
> vitest run tests/sacred_invariant.test.ts


 RUN  v3.2.7 C:/Users/coldb/SECTOR-305/packages/core

 ✓ tests/sacred_invariant.test.ts (5 tests) 14ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  22:25:39
   Duration  536ms (transform 77ms, setup 0ms, collect 162ms, tests 14ms, environment 0ms, prepare 53ms)

EXIT 0
```

---

## 6. Verdict

| Criterion | Evidence | Met? |
|-----------|----------|------|
| No swallow try/catch around expects | Full file read | YES |
| Bind does not rewrite golden | Full file read; corruption persists across process | YES |
| External corrupt → suite red | Pasted RED above, exit 1 | YES |
| Primary failure mode is content bind (`includesAllHard`) | Line 140 AssertionError false≠true | YES |
| Restore → suite green | Pasted GREEN above, 5/5, exit 0 | YES |

### **VERDICT: FIXED**

Refute attempt **failed**. External mutation protocol (§3.2) demonstrates the S1-VACUOUS bind can turn red when `session_fail.json` is corrupted (`DispatchUnits`→`NoOp`) and returns green when restored. The original vacuous pattern is gone.

**Note (out of S1-VACUOUS acceptance, not a re-open):** this verifier only mutated the fail golden per task brief. Pass-path structural bind was not externally mutated here; author claims NoOp-only fail of pass bind. S1-VACUOUS acceptance as stated for fail golden is satisfied.
