# Phase 0 coverage table (exit gate)

**Date:** 2026-07-18  
**Tests:** `npm test` → **75/75 passed**  
**Sacred invariant:** green (`sacred_invariant.test.ts`)

| Manifest ID | Artifact(s) | Evidence |
|-------------|-------------|---------|
| M01a Priority | pack priorities + runtime | undercode + aging tests |
| M01b Status FSM | statusMatrix + unit_statuses 64 cells | 35 matrix tests |
| M01c Radio | 12 templates + emergency + readback | radio_protocol 6 |
| M01d CFS lifecycle | runtime clear/hold/cancel | checkride pass/fail |
| M01e Location | confidence gates + map UI | FAIL_NO_VERIFY + map panel |
| M01f Assignment | backup min 2 | FAIL_NO_BACKUP |
| M02a Hard rubric | 24 FAIL_ codes | codes.ts + pack rubric |
| M02b Soft | 15 SOFT_ codes | codes.ts + pack |
| M02c Debrief | Runtime.debrief + UI form | disclaimer constant |
| M03 Schemas | packages/core/src/schema/* | schema.test.ts 7 |
| M04 Checkride | scenarios/checkride_a07_ocean_robbery_v1 | C1+C2+C4+C5 sessions |
| M05 Busy watch | watch/fridayNight.ts + scenario JSON | 9 CFS, 15 min, aging fail |
| M06 Text radio | templates + freeform + captions | keyboard pass demo |
| M07a–h Glass | packages/web App | queue, units, form, radio, timers, map, shell, debrief, export |
| M08 Replay | replaySession + multiset | double replay identical |
| M09 Pack | split JSON miami-a07-police-v0 | pack_validate 4 |
| M10 Goldens | 10 test files | 75 tests |
| M11 InfoSet | knowableSchedule apply + tests | infoset.test.ts C10 |
| M12 Timers | SLA + readback | aging + NO_READBACK |
| M13 CT inject | call_taker notes + schedule cues | fixtures + applyKnowableSchedule |
| M14 Policy | CONTENT_POLICY + kill grep | kill_list_guards |
| M15 CLI | sim fail/pass | both OK |
| M16 UI acceptance | docs/UI_ACCEPTANCE.md 20 steps | manual checklist shipped |
| M17 Kill guards | kill_list_guards | green |
| M18 Session export | Export SessionRecord button | UI |
| M19 Docs | spine complete | PHASE0, COVERAGE, CHALLENGE, CRITIC |
| M20 Critics | CRITIC_ROUNDS Round 2 fix + Round 3 zero hard | accepted soft: no Playwright |
| M21 Nature matrix | nature_matrix.json 14 | pack |
| M22 C1–C10 | CHALLENGE_COVERAGE.md | all rows have evidence |

## Sacred invariant

```
fail SessionRecord ×2 → hard multiset includes FAIL_NO_VERIFY, FAIL_PRIORITY_UNDERCODE, FAIL_NO_READBACK, FAIL_NO_BACKUP
pass SessionRecord ×2 → hard multiset empty
```

## Soft residual (not a hard fail of Phase 0)

- Playwright UI smoke not in CI (manual UI_ACCEPTANCE exists)
