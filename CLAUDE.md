# CLAUDE.md — SECTOR 305 agent law

Read `docs/BRIEF.md` first. This file is operational law for coding agents.

## Mission

Build a **certification-grade** fictional Miami PSAP **A-console** trainer. Depth over width. Phase 0 only until the vertical slice is real.

## Iron rules

1. **Doctrine before chrome.** Priorities, statuses, radio format, and grading outrank visual polish.
2. **Shell ≠ glass.** South Beach swag on launcher/menu only. Live CAD is EFIS navy glass (cyan/green/amber/red rationed). No hot-pink CAD chrome.
3. **Grade process, not vibes.** Fail wrong priority, bad unit selection, missed updates, status hygiene — even if the “story” worked.
4. **No arcade.** No chase points, superhero dispatch, omniscient perfect map, confetti debrief.
5. **No fake credentials.** Never claim official APCO/NENA/IAED certification. Use “standards-aligned training sim.”
6. **No real PII.** All names, phones, addresses fictional.
7. **Phase 0 freeze.** Reject full-county, fire/EMS depth, co-op, voice-required paths until Phase 0 exit criteria are met.
8. **Tests for the loop.** State machines + grading must have automated tests. “Not shit” is non-negotiable.
9. **Incomplete information is content.** Callers wrong, radio stepped on, late unit updates — design for it.
10. **If a real telecommunicator would laugh, rewrite doctrine — not particles.**

## Phase 0 freeze (in)

- One sector (fictional coastal / Central corridor)
- Police A-console only
- CFS lifecycle + timers
- Unit status board + assignment logic
- Radio log / template / readbacks (text first)
- Incident form + queue
- Imperfect map OK (last-known / lag allowed)
- One checkride scenario + one busy watch
- Debrief timeline + rubric fails
- Login / sector-open shell (swag OK here)

## Phase 0 freeze (out)

- Multi-agency full Miami
- Fire/EMS apparatus systems
- Required STT voice path
- Multi-console co-op
- Hurricane / active assailant as required content
- Official certification claims

## Suggested stack (justify if you diverge)

Prefer **shippable + testable**:

- **Web UI** (Vite + TypeScript + React or similar) for A-console
- Optional later: Tauri/Electron shell
- Scenarios as **JSON/YAML** under `scenarios/`
- Core sim logic in pure TS (or similar) with **unit tests** — UI is not the source of truth

## Repo layout (target)

```
SECTOR-305/
  CLAUDE.md
  README.md
  docs/
    BRIEF.md          # product law
    DOCTRINE.md       # priorities, statuses, radio format
    RUBRIC.md         # checkride fails / soft marks
  scenarios/          # JSON checkrides + watches
  src/
    core/             # state machines, grading (tested)
    ui/               # A-console, shell, debrief
  tests/
```

## First build order — Phase 0 seed SHIPPED

1. [x] `docs/DOCTRINE.md` + `docs/RUBRIC.md`
2. [x] Core models + `Runtime` in `packages/core`
3. [x] CFS + unit state machines + Vitest goldens
4. [x] Checkride fixtures + CLI `npm run sim -- fail|pass`
5. [x] Minimal A-console UI (`packages/web`, port 3050)
6. [x] Login shell (South Beach) vs clinical glass
7. [x] README + CI workflow

## Next build order (extend, don’t rewrite)

1. External scenario JSON loader + C1–C10 golden streams
2. Watch generator v0 + imperfect zone map
3. SessionRecord export in UI
4. Playwright smoke
5. Audio ports only after goldens stay green — **STT still off**

## Aesthetic tokens (working)

| Token | Use |
|--------|-----|
| Void / navy-black | Canvas |
| Glass panels | CAD windows |
| Cyan | Data / set-points / selected |
| Green | Engaged / available / good |
| Amber | Caution / aging timer / holding |
| Red | Emergency traffic / hard fail / stop |
| Neon hairline (menu only) | Brand swagger — not live form fields |

## What to do when stuck

- Thicken state machine + grading before new UI
- Add incomplete-info + timer fails before map art
- Prefer one deep scenario over ten shallow ones
- Ask the human only for product choices (stack, scope exceptions) — not for every hex color

## Done means

- `npm test` (or equivalent) green for core loop
- One checkride playable start → debrief
- At least one intentional process fail demonstrable
- Docs explain doctrine + how to run
