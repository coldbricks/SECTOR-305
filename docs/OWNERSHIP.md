# OWNERSHIP.md — wave writer map

**Wave:** WAVE_2026-07-19_instrument  
**Rule:** Exactly one writer per path. Readers unlimited. Unowned write = violation.

| Artifact path | Writer agent ID | Wave |
|---------------|-----------------|------|
| `docs/OWNERSHIP.md` | ORCHESTRATOR | instrument |
| `docs/waves/WAVE_2026-07-19_instrument.md` | ORCHESTRATOR | instrument |
| `docs/ORCHESTRATOR_PRIME.md` | HUMAN (frozen) | — |
| `docs/PHASE0_SCOPE_MANIFEST.md` | HUMAN (frozen) | — |
| `.git/**` / git commits | ORCHESTRATOR-GIT | instrument |
| `packages/web/src/App.tsx` | AGENT-INSTRUMENT | instrument |
| `packages/web/src/styles.css` | AGENT-INSTRUMENT | instrument |
| `packages/web/src/SectorMap.tsx` | AGENT-INSTRUMENT (prestige land only) | instrument |
| `packages/web/src/components/**` | AGENT-INSTRUMENT | instrument |
| `packages/web/src/audio/**` | AGENT-INSTRUMENT | instrument |
| `packages/web/src/training/**` | AGENT-INSTRUMENT | instrument |
| `packages/web/src/geo/**` | AGENT-INSTRUMENT | instrument |
| `packages/web/src/map/**` | AGENT-INSTRUMENT | instrument |
| `packages/web/public/**` | AGENT-INSTRUMENT | instrument |
| `packages/web/vite.config.ts` | AGENT-INSTRUMENT | instrument |
| `packages/core/**` | FROZEN this wave | instrument |
| `packs/**` | FROZEN this wave | instrument |

## Frozen interfaces (wave start)

- Zod spine under `packages/core/src/schema/**`  
- Pack JSON shapes under `packs/miami-a07-police-v0/**`  
- `FAIL_CODES` / `SOFT_CODES` closed sets  

## Barriers

1. Prestige baseline commit before instrument delta (optional single combined commit if cleaner history).  
2. Full `npm test` green before wave close.
