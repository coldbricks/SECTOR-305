# OWNERSHIP.md — wave writer map

**Wave:** WAVE_2026-07-18_r2  
**Rule:** Exactly one writer per path. Readers unlimited. Unowned write = violation.

| Artifact path | Writer agent ID | Wave |
|---------------|-----------------|------|
| `docs/OWNERSHIP.md` | ORCHESTRATOR | r2 |
| `docs/waves/WAVE_2026-07-18_r2.md` | ORCHESTRATOR | r2 |
| `docs/CRITIC_ROUNDS.md` | ORCHESTRATOR-LEDGER | r2 |
| `docs/ORCHESTRATOR_PRIME.md` | HUMAN (frozen) | — |
| `docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md` | HUMAN (read-only) | — |
| `docs/PHASE0_SCOPE_MANIFEST.md` | HUMAN (frozen) | — |
| `.git/**` / git commits | ORCHESTRATOR-GIT | r2 |
| `packages/core/src/runtime.ts` | AGENT-S1-TRUTHLEAK + AGENT-S2-SAFETYHATCH + AGENT-S3-1 + AGENT-S3-2 + AGENT-S3-3 (serial on same file — barrier) | r2 |
| `packages/core/src/fixtures.ts` | AGENT-S1-PSYCHIC | r2 |
| `packages/core/tests/checkride_sessions.ts` | AGENT-S1-PSYCHIC | r2 |
| `packages/core/tests/psychic_guard.test.ts` | AGENT-S1-PSYCHIC | r2 |
| `packages/core/tests/sacred_invariant.test.ts` | AGENT-S1-VACUOUS | r2 |
| `scenarios/checkride_a07_ocean_robbery_v1/session_fail.json` | AGENT-S1-PSYCHIC | r2 |
| `scenarios/checkride_a07_ocean_robbery_v1/session_pass.json` | AGENT-S1-PSYCHIC | r2 |
| `scenarios/checkride_a07_ocean_robbery_v1/EXPECTED.md` | AGENT-S1-PSYCHIC | r2 |
| `packages/core/tests/critic_s1_s2.test.ts` | AGENT-S1-TRUTHLEAK | r2 |
| `packages/core/tests/orphan_codes.test.ts` | AGENT-S2-ORPHANS | r2 |
| `packages/core/src/grade/codes.ts` | AGENT-S2-ORPHANS (read + emit fixtures only; no vocabulary shrink without amend) | r2 |
| `docs/DOCTRINE.md` | AGENT-S3-2 | r2 |
| `docs/COVERAGE_TABLE.md` | AGENT-S3-5 | r2 |
| `packages/core/tests/scenario_json_load.test.ts` | AGENT-S3-4 | r2 |
| `packages/core/src/schema/common.ts` | AGENT-S1-TRUTHLEAK (HANDOFF_NOTED flag only if needed) | r2 |
| Staging: `docs/waves/staging/**` | respective agents | r2 |
| `docs/waves/staging/REFUTE_*.md` | VERIFIER agents (read-only on product code) | r2 |

## Frozen interfaces (wave start)

- Zod spine under `packages/core/src/schema/**` — no silent shape changes  
- Pack JSON shapes under `packs/miami-a07-police-v0/**` — no silent shape changes  
- `FAIL_CODES` / `SOFT_CODES` closed sets — shrink only via written amend  

## Barriers

1. **runtime.ts multi-writer:** S1-TRUTHLEAK → S2-SAFETYHATCH → S3-1 → S3-2 → S3-3 serial on `runtime.ts` (same file; cannot parallel-write). Justified: single-file ownership cannot be split without mid-wave interface freeze break.  
2. **Integrator after all FIX agents:** INTEGRATOR-R2 merges, full `npm test`, commit.  
3. **Verify fan-out after green suite:** one VERIFIER per finding (refute posture) + MUTATION-PASS + FAIRNESS-AUDIT.
