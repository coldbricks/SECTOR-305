# SECTOR 305 — Multi-agent adversarial volley

**Date:** 2026-07-18  
**Session type:** Call-and-response · four agents · consensus for best-of-class GitHub  
**Repo:** `C:\Users\coldb\SECTOR-305`

## Agents

| Callsign | Role | Mandate |
|----------|------|---------|
| **DOCTRINE** | PSAP / SOP adversary | Real telecommunicator standards; kill fake games |
| **RADIO** | Audio systems adversary | STT, TTS, channel FX, scoring; kill gimmick audio |
| **ARENA** | Competitive / GitHub adversary | Define class, moats, anti-goals, 12-month path |
| **FORGE** | Principal eng adversary | Ship architecture; kill vapor |

---

## Round 1 — What class are we even in?

**ARENA:** You lose the moment you compete as a “911 game.” Class is:

> **Open-source certification-grade PSAP / telecommunicator console trainer**  
> (fictional jurisdiction · standards-aligned · not a substitute for agency cert)

**DOCTRINE:** Class membership is binary: process can fail the session even if the “story” resolved.

**FORGE:** If `SessionRecord` cannot replay headless to the same hard fails, you have a radio-themed toy.

**RADIO:** Audio is a *view* over structured events. Captions always. Mic never gates training validity.

**CONSENSUS — WIN THE UPPER-RIGHT**

```
SERIOUSNESS ▲
            │  commercial appliances ── [SECTOR 305 TARGET]
            │  VATSIM culture ──────────┘ open + graded + A-console
            │  Resgrid (ops CAD)
            │  911 Operator / superhero Dispatch / FiveM CAD
            └──────────────────────────────────────────► OPEN/FORKABLE
```

**Kill shot:** Closed trainers sell seats. SECTOR 305 publishes the **exam instrument**.

---

## Round 2 — Real-life SOPs (what must exist)

**DOCTRINE ranked non-negotiables:**

1. Role separation (C-side vs A-console vs sup) — player is not everyone  
2. CFS lifecycle with liability timestamps  
3. Priority as policy under incomplete info (reclass trail)  
4. Unit status machine with illegal transitions blocked  
5. Location confidence model (cannot treat unverified like gospel)  
6. Radio as protocol (templates, readbacks, emergency traffic mode)  
7. CAD narrative hygiene (append-only, disposition on close)  
8. Safety flags (weapons / in-progress) aired and graded  
9. Resource appropriateness ≠ closest green icon  
10. Timers as SOP (queue aging, SLA, overdue ER/OS)  
11. Documentation as legal artifact → debrief rebuilds from log  
12. Jurisdiction friction hooks (even Phase 0 one-sector)  
13. Language access as delay/accuracy system  
14. QA / checkride **is** the product  

**DOCTRINE kill list (never ship):** press-to-win, omniscient map, infinite units, status cosmetics, priority paint, chat radio, superhero clears, story-primary grade, fake APCO badges, licensed IAED card text, gore tourism, confetti debrief, auto-correct everything, neon live CAD.

**Licensed content law:**

| NEVER | CAN (original house doctrine) |
|-------|--------------------------------|
| IAED card text / determinants | S305 interrogation envelopes |
| APCO/NENA exam items / “you are certified” | P0–P5 priority table, status graph |
| Real SOP PDFs / real incident audio | Plain-language radio templates |
| Real PII | Fictional packs + disclaimers |

**DOCTRINE adversarial challenges (checkride must encode these):**

| ID | Challenge |
|----|-----------|
| C1 | Incomplete address under P1 pressure |
| C2 | Priority flip mid-call |
| C3 | Illegal status / ghost unit |
| C4 | Backup policy under unit poverty |
| C5 | Readback failure / no ack |
| C6 | Concurrency trap (P2+P4 while on P3) |
| C7 | Wrong jurisdiction / handoff |
| C8 | Language barrier (interpreter delay) |
| C9 | Officer emergency preempts your BOLO |
| C10 | Information-set fairness (don’t grade omniscience) |

---

## Round 3 — Speech recognition & audio synth

### RADIO steelman (best plan)

**Ship a radio protocol engine first; wrap acoustics later.**

```
Phase 0  Text + templates + RadioEvent + grader + debrief
Phase 1  Baked wet audio + FX bus + step-on + ghost tape
Phase 2  Offline TTS for generated watches (bake checkrides)
Phase 3  PTT → offline STT → fill template → confirm → grade SLOTS not WER
Phase 4  Full duplex / dual watch / net control stress
```

### STT (when we do it)

| Decision | Default |
|----------|---------|
| UX | Hold-to-talk PTT (not wake word, not open mic) |
| Scoring input | Final utterance only; partials = caption UX |
| Engine | Offline: faster-whisper / Whisper.cpp sidecar; Vosk optional light |
| Cloud | Opt-in plugin only; checkrides must not require it |
| On failure | Offer structured template; **never** brick the watch |
| Grade method | Doctrine slots (to/from/location/nature/status/order/brevity) — **not WER** |

**Latency budgets (training):** PTT sidetone &lt;30ms; final ASR &lt;1.5s or fall back; parse non-blocking.

**Callsign / codes:** Normalizer layer mandatory (`3A12`, status codes, street lexicon). Naked Whisper will garble the product.

### TTS / traffic synth

| Decision | Default |
|----------|---------|
| Checkrides | **Bake** audio at build time (deterministic) |
| Generated watches | Runtime local TTS + cache by hash |
| Voices | 6–12 procedural profiles; tired/professional; no comedy NPCs |
| Emotion | Small prosody profiles (`calm`, `winded`, `clipped_emergency`) not acting |

### Radio FX chain (credibility, not toy static)

```
dry TTS/canned
  → compression → bandpass ~300–3000 Hz → soft clip
  → squelch envelope → kerchunk (subtle)
  → talkgroup bus → meters + caption
```

**Busy net = scheduler**, not louder hiss: preemption, answer latency, droppable chatter, authored step-ons, incomplete syllables as incomplete-info content.

### Ghost tape (unfair advantage)

Reconstruct channel recording from `RadioEvent[]` + wet audio → scrub with CAD timeline + GradeEvents.  
Instructor-grade debrief. CI hashes **captions + event sequence**, not float samples.

### FORGE + RADIO agreement

- `SpeechToTextPort` / `TextToSpeechPort` defined Phase 0 with **null impl**  
- Grading keys off structured `PlayerCommand` / `ParsedRadio` only  
- Keyboard-only checkride always valid  
- **If demo leads with microphone before priority fail → mid**

---

## Round 4 — Architecture that can actually ship

**FORGE lock:**

| Layer | Choice |
|-------|--------|
| Kernel | Pure TypeScript, no DOM (`packages/core`) |
| Schemas | Zod (+ JSON Schema emit) |
| UI | Vite + React + CSS variables (EFIS tokens) |
| Desktop later | Tauri 2 (not Electron-first) |
| Doctrine | Data packs under `packs/` — never `if (miami)` |
| Tests | Vitest goldens + Playwright smoke |
| Truth model | Hidden `IncidentTruth`; player sees imperfect info |

**Event spine:**

```
PlayerCommand → Runtime reduce → SimEvent log → snapshot
                     ↓
              GradeEvent[] + RadioEvent[]
                     ↓
              Debrief / Replay / Ghost tape
```

**Closed Phase 0 command set:** notes, verify location, dispatch/add/release unit, set status, radio TX template, ack readback, status check, clear/cancel.

**Performance:** console not game loop — core advance &lt;2ms/100ms tick; no Three.js county globe.

---

## Round 5 — Competitive moats (GitHub-survivable)

**ARENA moats that forks still have to respect:**

1. Scenario format + schema + linter  
2. Stable fail-code vocabulary (`FAIL_PRIORITY`, `FAIL_STATUS_ILLEGAL`, …)  
3. Doctrine pack plugins  
4. Deterministic replay (`SessionRecord`)  
5. Golden checkrides in CI  
6. Incomplete-information mechanics as content  
7. Shell ≠ glass dual law  
8. Instructor inject + LMS-ish grade export (later)  
9. Honest credential posture forever  

**Anti-goals (high stars, mid product):** Steam “911 game” SEO, omniscient map, chase points, fake cert badges, neon CAD default, STT-required, LLM-only grading, FiveM adjacency, confetti debrief, empty whole-Miami map.

---

## Round 6 — Adversarial crossfire (highlights)

| Attack | Defense (consensus) |
|--------|---------------------|
| “Toy with serious costume” | Doctrine + fail codes + process-fail demo; depth of one sector |
| “Commercial AI trainers own this” | Don’t fight sales; own open instrument + deterministic eval + scenario commons |
| “Hardware multi-task wins muscle memory” | Software instrument first; PTT model bindable to HID later |
| “GitHub only rewards games” | Optimize for class authority (VATSIM-scale), not Fortnite stars |
| “Doctrine will be wrong” | Fiction S305 house law; packs for variants; argument = success signal |
| “Speech first = modern” | Speech first = flaky mid; protocol engine first |
| “Open source dies” | Core free forever; optional paid instructor/hosting later — never hostage the loop |
| “Solo A-console is incomplete” | Solo checkride is foundation; multiplayer after replay exists |

---

## CONSENSUS BLUEPRINT — “Best of this class ever on GitHub”

### Product identity

**SECTOR 305** = open A-console **checkride instrument**.  
South Beach swag on the shell. EFIS glass on the job. Complex systems. Not arcade. Not shit.

### Technical identity

**Deterministic pure-TS sim + data-driven SOP packs + machine rubric + interchangeable acoustic skin.**

### What “best” means (not star count)

1. Telecommunicator nods at the glass  
2. Instructor authors scenario + expected fails without a sales call  
3. CI proves legality + golden checkrides  
4. Failures are byte-reproducible  
5. Open doctrine + eval + scenario commons no closed vendor will match  

### Phase 0 exit (unchanged, hardened)

- DOCTRINE + RUBRIC shipped  
- Status/CFS machines tested  
- One checkride encoding ≥ C1+C2+C5  
- One busy watch  
- A-console glass (queue, units, form, radio log, timers, imperfect map)  
- Debrief eval form  
- Intentional process hard-fail demo  
- STT/TTS ports stubbed, feature-flag off  

### 12-month undeniable (ARENA)

| Window | Outcome |
|--------|---------|
| 0–3 mo | Instrument exists (Phase 0) |
| 3–6 mo | Training system: 10–20 goldens, schema lock, instructor inject, EN/ES friction |
| 6–9 mo | Ecosystem: doctrine packs, replay CLI, optional audio, first external scenario PR |
| 9–12 mo | Center culture: C+A co-op hooks, supervisor lite, published adversarial review invite |

---

## Immediate write order (agents agree)

1. `docs/DOCTRINE.md` — tables from DOCTRINE agent  
2. `docs/RUBRIC.md` — domains + fail codes  
3. `docs/ARCHITECTURE.md` — FORGE stack + module map  
4. `packs/miami-a07-police-v0/` — machine law JSON  
5. `packages/core` — models, machines, grade, replay  
6. Text radio + one checkride + debrief  
7. Only then: canned audio → TTS → STT  

---

## One-line tattoo

> **If the session cannot be replayed headless to the same hard fails, you don’t have a trainer — you have a radio-themed toy.**

**Secondary:** Grade slots and process, not waveforms and vibes.  
**Tertiary:** Shell can flirt. Console does not perform.
