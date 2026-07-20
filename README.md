<p align="center">
  <img src="docs/screenshots/01-title-watch-directive.png" alt="SECTOR 305 — public safety training simulation title shell" width="100%" />
</p>

<h1 align="center">SECTOR 305</h1>

<p align="center">
  <strong>Complexity that grades you.</strong><br />
  Miami fiction · Console A07 · Imperfect last-known<br />
  A doctrine-driven PSAP dispatch simulator where <em>process</em> decides the watch.
</p>

<p align="center">
  <a href="https://github.com/coldbricks/SECTOR-305/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/coldbricks/SECTOR-305/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Node 20+" src="https://img.shields.io/badge/node-20%2B-3c873a" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-113_passing-brightgreen" />
  <img alt="License MIT" src="https://img.shields.io/badge/code-MIT-38beeb" />
</p>

<p align="center">
  <a href="#run-the-watch">Run</a>
  &nbsp;·&nbsp;
  <a href="#the-instrument">Instrument</a>
  &nbsp;·&nbsp;
  <a href="#original-soundtrack">Soundtrack</a>
  &nbsp;·&nbsp;
  <a href="#read-deeper">Docs</a>
</p>

<p align="center">
  <em>Original score — David Lombardo ·</em>
  <a href="https://coldbricks.github.io/SECTOR-305/ost/">listen in browser</a>
</p>

---

<p align="center">
  <img src="docs/screenshots/02-live-a-console.png" alt="SECTOR 305 live A-console — queue, CFS, unit board, GIS sector plate, radio bank, live grader" width="100%" />
</p>

<p align="center">
  <sub>One glass. Full watch. Live grader. No arcade chrome on the CAD.</sub>
</p>

## This is not a toy

You sit the **A-console** in a fictional Miami-area sector: own the queue, verify imperfect locations, classify priority, build the response, protect airtime, take readbacks, keep unit status honest, leave a record that would survive scrutiny.

The sim does not care if the story ended with a hero shot.  
It cares whether your **process** held when the board got loud.

Not city-builder. Not production CAD. Not a credential mill.  
A training instrument built so operational discipline is *playable*—and *auditable*.

| | |
|:---|:---|
| **Deterministic kernel** | Same seed + command stream → same evaluation. Every time. |
| **Information-set fairness** | Hidden scenario truth cannot fail you until the cue is knowable. |
| **Sacred replay** | A `SessionRecord` stores commands; the engine re-derives state and debrief. |
| **Adaptive mastery** | Failures become next watch’s focus—not XP, not streaks, not cosplay ranks. |
| **Original score** | Full title performance + 16 scenario beds that duck under radio traffic. |

## The instrument

<p align="center">
  <img src="docs/screenshots/05-scenario-score-desk.png" alt="Scenario score desk with original track catalog" width="100%" />
</p>

Everything the watch needs lives in one coherent frame:

- **Incident queue** — priority, age, imperfect last-known, ACK discipline  
- **CFS workbench** — nature, location confidence, weapons/backup flags, radio composition  
- **Unit boards** — police / fire / EMS / air / hospital / special-use  
- **Sector plate** — layered Miami GIS atmosphere, live tracks, radar context  
- **Channel bank** — fictional training channels with a clean local-adapter seam  
- **Live grades** — hard fails and soft coaching as the clock runs  
- **Keyboard path** — full checkride without hunting the mouse  
- **Score desk** — bed on/off, prev/next, direct select; music never owns the air  

## Pass clean—or learn exactly why

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/03-checkride-pass.png" alt="Qualified checkride debrief" />
    </td>
    <td width="50%">
      <img src="docs/screenshots/04-adaptive-correction.png" alt="Corrective checkride with doctrine findings" />
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>Qualified</strong><br />
      <sub>Zero hard fails. Next watch: hold the standard under pressure.</sub>
    </td>
    <td align="center">
      <strong>Corrective</strong><br />
      <sub>Evidence-backed findings become the next operating focus.</sub>
    </td>
  </tr>
</table>

No points theater. No fake certs. After each watch the profile updates across real domains—location, priority, assignment, status, radio, tempo, documentation, safety, multi-call, information constraints—and the next launch opens with one explicit directive:

```text
WATCH DIRECTIVE · LOCATION
Prove the location discipline holds · no hard fails yet
```

## Original soundtrack

<p align="center">
  <a href="https://coldbricks.github.io/SECTOR-305/ost/">
    <img src="docs/ost/cover-1500.jpg" alt="SECTOR 305 Original Soundtrack cover" width="240" />
  </a>
</p>

<p align="center">
  <strong>Coldbricks · David Lombardo</strong><br />
  Recorded July 2026 · Smithtown, New York<br />
  <a href="https://coldbricks.github.io/SECTOR-305/ost/">17 tracks · title theme + scenario beds →</a>
</p>

Shell opens on the title performance. The watch rotates beds that duck under dispatch and unit traffic so the radio stays intelligible. The score is part of the product—not a free stock loop.

## Run the watch

Node.js **20+**.

```bash
git clone https://github.com/coldbricks/SECTOR-305.git
cd SECTOR-305
npm install
npm run dev
```

Open [http://127.0.0.1:3050](http://127.0.0.1:3050) → let the title track breathe → **BEGIN**.

```bash
npm test                  # 113 core assertions · 19 files
npm run test:e2e          # browser acceptance
npm run typecheck
npm run build
npm run validate:packs    # doctrine + rubric integrity
npm run sim -- pass       # clean canonical checkride
npm run sim -- fail       # intentional multi-finding checkride
```

## Architecture

```text
packs/*                 doctrine · natures · rubric (data, not hardcode)
        ↓
packages/core           pure TypeScript runtime · no DOM · seeded clock
        ↓
PlayerCommand → SectorState → GradeEvent → Debrief
        ↓                              ↓
packages/web            React console · GIS · audio director · mastery
                        SessionRecord replay must match UI hard-fails
```

If you cannot replay a session headlessly and get the same hard-fail multiset, the instrument is broken. That invariant is the product.

## Verification

| Gate | What it protects |
|---|---|
| Core suite | Doctrine behavior, infoset fairness, radio protocol, sacred replay |
| Pack validation | Natures, rubric rules, scenario load integrity |
| Headless sims | Deterministic pass and multi-finding fail demos |
| Playwright e2e | Full browser path + responsive acceptance widths |
| A11y posture | Keyboard path, focus visibility, reduced-motion, radio intelligibility |

CI runs typecheck, core tests, production build, pack validation, both sims, and e2e.

## Data, audio, and attribution

- Geographic atmosphere from [City of Miami GIS Open Data](https://datahub-miamigis.opendata.arcgis.com/) — **non-operational**.  
- Zones, units, incidents, doctrine, and scenario truth are **fictional training content**.  
- Public channel bank is independently authored fiction.  
- Music: *Dispatch in Miami* + sixteen scenario masters by **David Lombardo** · © 2026, all rights reserved (separate from the source-code license).

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Safety and honesty

SECTOR 305 is a fictional training simulation. It is **not** affiliated with the City of Miami, Miami-Dade County, any PSAP, RadioReference, APCO, NENA, or IAED. It is not a substitute for agency policy, supervised training, or production dispatch software. Completing an in-product track grants **no** real credential.

## Read deeper

- [Product brief](docs/BRIEF.md) · [Architecture](docs/ARCHITECTURE.md) · [Doctrine](docs/DOCTRINE.md) · [Rubric](docs/RUBRIC.md)  
- [Content policy](docs/CONTENT_POLICY.md) · [Adversarial design review](docs/ADVERSARIAL_VOLLEY.md) · [Roadmap](docs/FULL_PRODUCT_ROADMAP.md)

## Contributing

The highest-value contribution is adversarial operational review: unfair grade, incoherent doctrine, or a console habit that teaches the wrong instinct. Open an issue with reproducible evidence and the scenario clock.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Source and original documentation: [MIT](LICENSE).  
Music: © 2026 David Lombardo — all rights reserved · [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
