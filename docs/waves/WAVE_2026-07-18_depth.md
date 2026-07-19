# WAVE_2026-07-18_depth — Phase 0 residual depth (post-critic)

**PRIME re-read:** yes  
**Open external critic findings:** none (closed r2d)  
**Scope:** Phase 0 freeze — depth only, no fire/EMS/STT/multi-county

## Work units (one agent each)

| ID | Work | Writer |
|----|------|--------|
| D-LOADER | Scenario JSON → Runtime load path | AGENT-LOADER |
| D-SOFT | Emit deferred soft codes with fixtures | AGENT-SOFT |
| D-TRUTHGREP | Untagged truth. grep guard | AGENT-TRUTHGREP |
| D-PW | Playwright smoke shell→glass | AGENT-PW |

**Barrier:** none between units (different paths).  
**Integrator:** full suite + commit after all.

## Frozen interfaces
Zod/pack/FAIL_CODES unchanged unless HANDOFF already present.
