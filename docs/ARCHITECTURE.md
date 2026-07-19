# SECTOR 305 — Architecture (FORGE consensus)

See also: [ADVERSARIAL_VOLLEY.md](./ADVERSARIAL_VOLLEY.md) · [BRIEF.md](./BRIEF.md) · [CLAUDE.md](../CLAUDE.md)

## Stack (locked)

| Layer | Choice |
|-------|--------|
| Sim kernel | Pure TypeScript (`packages/core`) — no DOM |
| Schemas | Zod (+ JSON Schema emit) |
| UI | Vite + React + CSS variables (EFIS tokens) |
| Desktop later | Tauri 2 |
| Doctrine | JSON packs under `packs/` |
| Tests | Vitest (core goldens) · Playwright (smoke) |
| Audio Phase 0 | Text radio + optional Web Audio key-up |
| STT/TTS | Ports with null impl; offline sidecar later |

## Module map

```
packs/* (data)
    → doctrine engine (pure legality)
    → scenario runtime (clock, seed, commands)
    → grading (rubric → GradeEvent)
    → replay / debrief
CAD UI (glass) + shell (swag)  → PlayerCommand only
radio audio service (optional) → plays RadioEvent, never invents law
```

## Domain spine

- `Incident` + hidden `IncidentTruth`
- `Unit` + guarded status graph
- `RadioEvent` (caption always)
- `GradeEvent` (hard_fail | soft | note)
- `Scenario` + seed + timeline injects
- `SessionRecord` = scenarioId + pack + seed + commands[] → identical debrief

## Radio / speech (adapter only)

```
Phase 0: Template/UI → PlayerCommand → RadioEvent
Phase 1: + baked audio + FX + ghost tape
Phase 2: + local TTS for watches
Phase 3: PTT → offline STT → template confirm → same PlayerCommand
```

Grading uses structured fields only — never raw WER.

## Repo target layout

```
SECTOR-305/
  CLAUDE.md
  README.md
  docs/
  packs/miami-a07-police-v0/
  scenarios/
  packages/core|ui|audio
  apps/web
  tests/fixtures|goldens
```

## Non-mid invariant

Headless replay of a `SessionRecord` must reproduce the same hard fails as the UI session.
