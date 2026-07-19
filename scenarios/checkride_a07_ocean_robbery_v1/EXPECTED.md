# Checkride EXPECTED — a07 ocean robbery v1

**Seed:** 305001  
**Pack:** miami-a07-police-v0@0.2.0  
**Tags:** C1, C2, C4, C5  

## Fail SessionRecord (`session_fail.json`)

Player undercodes to P4, dispatches one unit without verify, no weapons air, no readback, advances past timeout.

**Required hard fail multiset (must include at least):**

- `FAIL_PRIORITY_UNDERCODE`
- `FAIL_NO_VERIFY`
- `FAIL_NO_BACKUP`
- `FAIL_NO_READBACK`
- `FAIL_SAFETY_NOT_AIRED` (weapons truth)

**Sacred invariant:** double headless replay → identical hard multiset key.

Evidence: `npm test` → `sacred_invariant.test.ts`.

## Pass SessionRecord (`session_pass.json`)

Verify 1400 Ocean, reclass ROBBERY-IP P1, weapons+backup flags, two units, weapons aired, readbacks, legal statuses, clear GOA.

**Hard fails:** none (empty multiset).

Evidence: same test suite pass path.
