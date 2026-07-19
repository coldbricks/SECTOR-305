# SECTOR 305

**Certification-grade fictional Miami A-console PSAP trainer.**

> South Beach swag on the shell. Ruthless instrument on the glass. Complex systems. Not arcade. Not shit.

**Status:** Phase 0 **instrument exit accepted** — pure sim core, **75** automated tests (64-cell status matrix, sacred replay, busy watch, infoset C10), CLI checkride fail/pass, A-console with imperfect map + SessionRecord export. See `docs/COVERAGE_TABLE.md` + `docs/CRITIC_ROUNDS.md`.

```
C:\Users\coldb\SECTOR-305
```

## Disclaimer

Training simulation only. **Not** a substitute for agency training. **Not** affiliated with Miami-Dade or any PSAP. **Not** APCO/NENA/IAED certification. Completing in-product tracks grants **no** real credential. All geography and incidents are fictional.

## Quick start

```bash
cd C:\Users\coldb\SECTOR-305
npm install
npm test
npm run sim -w @sector305/core -- fail
npm run sim -w @sector305/core -- pass
npm run dev -w @sector305/web
```

- Tests: state machine + golden pass/fail/aging + deterministic replay  
- UI: http://localhost:3050 — shell → A-console → debrief  
- Intentional fail: undercode, no verify, single unit, no weapons on radio, no readback  

## Class (read this)

This is an **open PSAP console training instrument**, not a 911 Operator-style city game and not a production CAD.

See [docs/ADVERSARIAL_VOLLEY.md](docs/ADVERSARIAL_VOLLEY.md) and [docs/FULL_PRODUCT_ROADMAP.md](docs/FULL_PRODUCT_ROADMAP.md).

## Docs

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](CLAUDE.md) | Agent law / Phase 0 freeze |
| [docs/BRIEF.md](docs/BRIEF.md) | Product brief |
| [docs/DOCTRINE.md](docs/DOCTRINE.md) | House SOP (fictional, machine-aligned) |
| [docs/RUBRIC.md](docs/RUBRIC.md) | Fail codes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack |
| [docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md) | Trauma / IP / ethics |
| [docs/WEAKNESS_CLOSURE.md](docs/WEAKNESS_CLOSURE.md) | How self-audit gaps were closed |
| [docs/FULL_PRODUCT_ROADMAP.md](docs/FULL_PRODUCT_ROADMAP.md) | 0 → full product |

## Repo layout

```
packs/miami-a07-police-v0/   doctrine pack (JSON)
packages/core/               pure TS runtime + tests + CLI
packages/web/                React A-console
scenarios/                   checkride metadata
docs/                        law + roadmap
```

## For telecommunicators / reviewers

We want adversarial review. Open an issue with `doctrine-bug` or `grade-false-positive`. Argue the cutoffs — that means the instrument is real enough to argue with.

## For Claude Code

```text
Read CLAUDE.md, docs/DOCTRINE.md, docs/RUBRIC.md, docs/FULL_PRODUCT_ROADMAP.md.
Extend Phase 0: external scenario loader, C1–C10 goldens, map panel.
Do not enable STT. Do not neon the live CAD.
npm test must stay green.
```

## License

MIT — see [LICENSE](LICENSE).
