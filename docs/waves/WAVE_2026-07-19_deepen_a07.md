# WAVE_2026-07-19_deepen_a07 — Checkride class + soft band + replay

**PRIME re-read:** yes  
**ARMORY:** G1–G8, max_compute ON, fanout, operating_doctrine  
**Scope (G4 clamp):** Phase 0 freeze holds — police A-console A07 deepen only.  
No STT-required path. No fire/EMS grading. No multi-county. Shell ≠ glass.

## One-sentence scope

Ship a multi-scenario **checkride class** (ocean + 4 new), **soft-band scoring** on debrief, **SessionRecord import → debrief**, catalog on shell, goldens + docs truth-up — freeze intact.

## Frozen interfaces

- Zod spine / FAIL_CODES / SOFT_CODES — unchanged (no new codes)  
- Runtime command shapes — unchanged  
- Pack JSON shapes — unchanged (soft weights mirrored in core helper from rubric_soft law)  
- Sacred invariant — every new scenario ships pass/fail companion streams  

## Work units

| ID | Work | Status |
|----|------|--------|
| W-SOFT | Soft-band score on Debrief + tests | in progress |
| W-SCEN | 4 new checkrides + builders + pass/fail sessions + tests | pending |
| W-CATALOG | Browser-safe scenario class catalog | pending |
| W-REPLAY | SessionRecord import → replay debrief | pending |
| W-UI | Soft band + catalog + import on shell/debrief | pending |
| W-DOCS | Roadmap + CHALLENGE_COVERAGE playable links | pending |
| W-M16 | Playwright M16 keyboard path (best-effort this wave) | pending |
| W-VERIFY | npm test + typecheck + e2e green | pending |

## Not in wave

Fire/EMS grading, co-op, STT, watch generator, multi-county, LLM grading.

## Ledger

### Built
_(filled at close)_

### Evidence
_(paste command output)_

### Closed
_(commit hash)_
