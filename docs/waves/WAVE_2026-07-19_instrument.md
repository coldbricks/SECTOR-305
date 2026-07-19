# WAVE_2026-07-19_instrument — Prestige land + instrument depth

**PRIME re-read:** yes  
**ARMORY:** guards G1–G8, max_compute, fanout, operating_doctrine bound  
**Open critic findings:** none  
**Scope (G4 clamp):** Phase 0 freeze holds — police A-console checkride instrument.  
No STT-required path. No fire/EMS *grading* depth (UI flavor only).  
Shell ≠ glass. Doctrine before chrome.

## One-sentence scope

Land uncommitted prestige console, then elevate the **live instrument loop**: grades visible as you work, keyboard-first M16 path, knowable cue windows, radio caption discipline, academy coach aligned to pass path, debrief as after-action timeline.

## Frozen interfaces

- Zod spine / FAIL_CODES / SOFT_CODES — unchanged  
- Runtime command shapes — unchanged  
- Pack JSON — unchanged  

## Work units

| ID | Work | Writer |
|----|------|--------|
| W-LAND | Commit prestige UI + audio/geo assets as baseline | ORCH-GIT |
| W-GRADES | LiveGradeStrip — hard/soft as grader emits | AGENT-INSTRUMENT |
| W-CUES | Cue-window HUD (T+15 weapons / T+25 address) pedagogical only | AGENT-INSTRUMENT |
| W-RADIO | Caption element meter vs pack requiredDispatchElements | AGENT-INSTRUMENT |
| W-KEYS | Keyboard map for M16 path | AGENT-INSTRUMENT |
| W-COACH | Optional fire/air steps; step-complete ding; +sim apply | AGENT-INSTRUMENT |
| W-AAR | Debrief chronological grade timeline | AGENT-INSTRUMENT |
| W-VERIFY | npm test green + tsc web | ORCH-VERIFY |

## Barriers

1. W-LAND commit before further edit history confusion (G1).  
2. W-VERIFY after all instrument files.  

## Not in wave (WRONG, not expensive)

- Fire/EMS grading, co-op, STT, multi-county  
- LLM grading  
- Expanding scenario count (Phase 1)  

## Ledger

### Built
- Prestige console (shell/map/audio/coach/agency) landed in tree
- `LiveGradeStrip` — hard/soft counts + CRIT banner + rolling feed
- `CueWindowHud` — T+15 weapons / T+25 location knowable windows (pedagogical)
- `RadioCaptionMeter` — unit/priority/nature/location/weapons air discipline
- `useConsoleHotkeys` — full M16 keyboard path (`?` help)
- Coach: required vs optional steps; fire/air optional (Phase 0 freeze); step ding; advance-sim button
- Debrief: full chronological evaluation timeline from core

### Evidence
```
npm test → 16 files / 103 tests passed
packages/web npx tsc --noEmit → exit 0
```

### Wave-boundary (unlimited compute)
More that could be done: Playwright M16 keyboard path golden; SessionRecord import UI; soft-band scoring UI.  
Deferred because Phase 1 / polish residual — not required to close this instrument wave. Not WRONG to ship instrument loop first.

### Closed
Commit hash: `552f994`
