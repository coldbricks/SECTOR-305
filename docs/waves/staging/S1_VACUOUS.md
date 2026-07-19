# S1-VACUOUS — FIX report (AGENT-S1-VACUOUS)

**Wave:** WAVE_2026-07-18_r2  
**Finding:** `docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md` § FINDING S1-VACUOUS  
**Disposition:** FIX  
**Owned paths written:**
- `packages/core/tests/sacred_invariant.test.ts`
- `docs/waves/staging/S1_VACUOUS.md` (this file)

**Not written (ownership):** `session_fail.json` / `session_pass.json` (AGENT-S1-PSYCHIC). Mutation experiments restored both goldens.

---

## Critic claim (quoted)

> the entire body — including all `expect(...)` calls — is wrapped in `try { … } catch { expect(true).toBe(true); }`. A failing assertion throws, is caught, and the test passes. It is structurally impossible for this test to fail.
>
> **Acceptance (falsifiable):** Corrupting one command in `session_fail.json` makes `npm test` fail. Same treatment for `session_pass.json`.

Also closed residual from `docs/REFUTE_ROUND_CRITIC_FIXES.md`: bind test must **not** call `writeSessionFiles()` before reading the golden (self-healing defeat).

---

## What changed

| Defect | Fix |
|--------|-----|
| `try { expects } catch { expect(true).toBe(true) }` | **Deleted.** No catch swallows assertions. |
| Bind rewrote golden (`writeSessionFiles`) | **Deleted.** Bind tests only `readFileSync` + `replaySession`. |
| Committed fail golden decorative | Bind asserts `includesAllHard(..., [FAIL_NO_VERIFY, FAIL_PRIORITY_UNDERCODE, FAIL_NO_READBACK]) === true` on disk bytes. |
| Committed pass golden weak | Bind asserts length ≥ 8, contains `VerifyLocation` + `DispatchUnits`, `debrief.passed`, empty hardFails (NoOp-only play fails structural bind). |
| Mutation protocol | In-test: corrupt one `DispatchUnits` → NoOp on disk → `includesAllHard` false → restore → true. `try/finally` restores only; does not catch expects. |

### HEAD vs fix (vacuous pattern gone)

HEAD (`git show HEAD:…/sacred_invariant.test.ts`) still had:

```ts
try {
  const record = JSON.parse(...);
  expect(includesAllHard(...)).toBe(true);
} catch {
  expect(true).toBe(true);
}
```

Working-tree bind (excerpt):

```ts
it("committed session_fail.json is bound WITHOUT rewrite (S1-VACUOUS)", () => {
  expect(existsSync(failPath)).toBe(true);
  const record = JSON.parse(readFileSync(failPath, "utf8")) as SessionRecord;
  // … replay …
  expect(includesAllHard(debrief.hardFails, [...FAIL_HARD_REQUIRED])).toBe(true);
});
```

Grep: no `catch {`, no `expect(true).toBe(true)`, no `writeSessionFiles` call site (comment only).

---

## Evidence — baseline green

```
$ npx vitest run tests/sacred_invariant.test.ts
 ✓ tests/sacred_invariant.test.ts (5 tests) 16ms
 Test Files  1 passed (1)
      Tests  5 passed (5)
EXIT 0
```

---

## Evidence — mutation protocol (fail golden)

**Corrupt:** one command in `session_fail.json` — `DispatchUnits` → `NoOp` (valid JSON, no BOM, no regenerate).

```
CORRUPT: DispatchUnits -> NoOp at index 1

 × committed session_fail.json is bound WITHOUT rewrite (S1-VACUOUS)
   → expected false to be true // Object.is equality
     at expect(includesAllHard(...)).toBe(true)

EXIT 1   # RED
```

**Restore** original bytes → full suite:

```
 ✓ tests/sacred_invariant.test.ts (5 tests)
EXIT 0   # GREEN
```

Falsifiable property shown: `includesAllHard` is **false** under corrupt disk bytes; bind requires **true** → suite fails. File is not rewritten by the bind test.

---

## Evidence — mutation protocol (pass golden)

**Corrupt:** `session_pass.json` commands → `[{ NoOp }]`.

```
 × committed session_pass.json bound without rewrite
   → expected 1 to be greater than or equal to 8
EXIT 1   # RED
```

**Restore** → green (suite final 5/5).

Note: bare `debrief.passed && hardFails==[]` is insufficient (empty play still “passes”). Structural bind closes that hole per critic “same treatment for session_pass.json”.

---

## In-process mutation test (author leave-behind)

`mutation: corrupt session_fail.json → includesAllHard false; restore → true`

- Writes corrupt golden on disk, re-reads, asserts `includesAllHard === false`
- `finally` restores `.bak` (restore only — **not** an assertion catch)
- Re-reads restored file, asserts `includesAllHard === true`

VERIFIER must re-run external corrupt/red/restore/green (above) and may also force the mutation test red by starting from an already-corrupt golden.

---

## Acceptance checklist

| Critic acceptance | Status |
|-------------------|--------|
| Delete try/catch that swallows expects | DONE |
| Bound committed `session_fail.json` without regenerate | DONE |
| Corrupt one command in `session_fail.json` → suite assertion fails | DONE (includesAllHard false→true bind) |
| Same treatment `session_pass.json` | DONE (structural + grade bind) |
| Tests can fail (mutation / VERIFIER re-run) | DONE |

**Author does not close finding.** Closure = VERIFIER-S1-VACUOUS pastes independent red→green into wave ledger.

---

## Residual / handoff

- Goldens themselves remain owned by AGENT-S1-PSYCHIC; this agent only reads them.
- Commit of this test is ORCHESTRATOR-GIT / integrator wave duty.
- If PSYCHIC changes fail multiset codes, update `FAIL_HARD_REQUIRED` in sacred test under this ownership.
