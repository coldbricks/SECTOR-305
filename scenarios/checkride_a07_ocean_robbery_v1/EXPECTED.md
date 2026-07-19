# Checkride EXPECTED — a07 ocean robbery v1 (fair timeline)

**Seed:** 305001  
**Pack:** miami-a07-police-v0  
**Tags:** C1, C2, C4, C5, C10  
**Finding fix:** S1-PSYCHIC (WAVE_2026-07-18_r2)

## Knowable schedule (truth)

| tMs | Facet | Summary |
|-----|-------|---------|
| 15000 | weapons / nature / priority | knife / bag / robbery cues |
| 25000 | location | 1400 Ocean Drive |

Source of truth: `incidentRobberyBadAddress()` in `packages/core/src/fixtures.ts`.

## Fail SessionRecord (`session_fail.json`)

Pre-cue (@2s): note only — no dispatch, no reclass.  
Post-cue (@27s ≥ location+weapons cues): dispatch 1× unit as P3, no verify, no weapons in caption, no ack.  
@80s: NoOp to expire readback window (45s after dispatch).

**Required hard fails (multiset includes):**

- `FAIL_NO_VERIFY`
- `FAIL_PRIORITY_UNDERCODE`
- `FAIL_NO_READBACK`
- `FAIL_NO_BACKUP`
- `FAIL_SAFETY_NOT_AIRED` (weapons knowable post-cue)

All undercode/verify/backup/safety grade `atMs ≥ 15000` (actually ≥27000 at dispatch clock).

## Pass SessionRecord (`session_pass.json`)

| Action | atMs | Enabling cue |
|--------|------|--------------|
| Hold note | 1000 | (none required) |
| SetNature ROBBERY-IP | 17000 | weapons/nature @15000 |
| SetPriority P1 | 17500 | priority @15000 |
| WEAPONS / NEEDS_BACKUP flags | 18000–18500 | weapons @15000 |
| VerifyLocation 1400 Ocean | 27000 | location @25000 |
| Dispatch 2 units + weapons air | 28000 | post all cues |
| Readbacks / on scene / clear | 30s–51s | — |

Hard fails: none. Human-playable without clairvoyance.

## Fairness guard

`packages/core/tests/psychic_guard.test.ts` — automated no-clairvoyance checks on in-memory goldens **and** committed SessionRecord JSON, derived from `knowableSchedule`.
