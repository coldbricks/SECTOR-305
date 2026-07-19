# Critic rounds ledger

## S0 stop-work — GIT (external S0-GIT)

**Response: FIX**

```
$ git init && git add -A && git commit
[master (root-commit) 5fc52a6] S0-GIT: initial commit — Phase 0 instrument tree
 90 files changed, 14218 insertions(+)

$ git log --oneline -1
5fc52a6 S0-GIT: initial commit — Phase 0 instrument tree
```

Acceptance: `git log` shows ≥1 commit. CI file present for future remote.

---

## External findings (docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md)

### S1-PSYCHIC — FIX

- `fixtures.ts`: `knowableSchedule` weapons/nature/priority @15000, location @25000  
- `checkride_sessions.ts`: pass/fail retimed post-cue only  
- `psychic_guard.test.ts`: automated no-clairvoyance  
- Fail hard fails require `atMs >= 15000` for undercode/verify/backup/safety  

### S1-VACUOUS — FIX

- Removed try/catch swallow  
- `session_fail.json` hard-bound  
- Mutation test: corrupt session → `includesAllHard` false → restore green  

### S1-TRUTHLEAK — FIX

- `dispatchUnits` undercode/verify/readback/backup use `isHighAcuityKnowable()`  
- `critic_s1_s2.test.ts`: pre-cue zero hard undercode/verify; post-cue undercode fires  

### S2-SAFETYHATCH — FIX

- Effective caption graded; omitted caption auto-appends weapons when knowable; explicit wrong caption → FAIL_SAFETY_NOT_AIRED  
- Tests in critic_s1_s2  

### S2-ORPHANS — FIX

- Emissions wired for jurisdiction, type, stale, abandon, reclass, divert, double, etc.  
- `orphan_codes.test.ts`: every FAIL_/SOFT_ emitted or DEFERRED with phase tag  
- FAIL_INFOSET_VIOLATION deferred as test-only by design  

### S3 batch — FIX

1. Status launder → SOFT_STATUS_QUERY_LATE  
2. Force-clear documented in DOCTRINE.md + system note  
3. idSeq instance-local  
4. scenario.json load still Phase 0.5 (honest)  
5. Test count now 88 (this wave)  

---

## Wave command evidence (pasted)

```
$ npm test
 Test Files  13 passed (13)
      Tests  88 passed (88)
```

```
$ npx tsc -p packages/core/tsconfig.json --noEmit
(exit 0, empty output)
```

---

## Separate refute agent

See `docs/REFUTE_ROUND_CRITIC_FIXES.md` (spawned agent; must complete before zero-finding claim).

---

## Wave-boundary self-check (unlimited compute)

**What more could be done:**

1. Wire every DEFERRED soft code with real emitters (not phase1 defer)  
2. Scenario JSON loader so scenario.json is not decorative  
3. Playwright 20-step UI_ACCEPTANCE in CI with mutation  
4. Property test: random SessionRecords never use post-cue facts pre-cue  
5. FAIL_INFOSET_VIOLATION assert on any remaining direct truth read via eslint rule  

**Why not all done this second:** (1)(2)(3)(5) are real next-wave work; not skipped for cost — pending refute agent + commit of this fix wave first. (4) partially covered by psychic_guard.

**Zero-finding claim:** NOT YET — wait for refute agent + second dry pass.
