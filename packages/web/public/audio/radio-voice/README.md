# Radio voice library (SECTOR 305 · A07)

Multi-voice baked TTS for the live console. Playback runs through a **radio channel chain** (band-limit, AGC, squelch) in `src/audio/radioSpeech.ts`.

## Source of truth

| File | Role |
|------|------|
| **`lexicon.json`** | Units, streets, natures, priorities, dispatch recipes, voices |
| `lines.json` | Expanded catalog (generated — don't hand-edit at scale) |
| `manifest.json` | Runtime lookup (generated after TTS bake) |
| `*.mp3` | Baked clips |

## Sample-driven expansion (this is the system)

**You do not hand-write every clip.** You write *samples*; the program builds the matrix.

| File | Role |
|------|------|
| **`speech_rules.json`** | Patterns: “`{callsign_spoken}, back in service {time_spoken}.`”, LAPD + NATO, time digits |
| **`lexicon.json`** | Units, voices, streets, dispatch recipes, 911 callers |
| `scripts/radio-speech-engine.mjs` | Expands samples → full phrase list |
| `scripts/build-radio-catalog.mjs` | Merges matrix + content → `lines.json` |
| `scripts/elevenlabs-radio.mjs` | Bakes only **missing/changed** mp3s |

### Example sample → product

```text
Sample:  "{callsign_spoken}, back in service {time_spoken}."
Unit:    3A12  →  three Adam twelve   (LAPD)
Time:    2121  →  two one two one     (digit radio clock)
Result:  "three Adam twelve, back in service two one two one."
```

NATO pack (optional): `three Alpha twelve…` for the same traffic.

### Commands

```powershell
$env:ELEVENLABS_API_KEY = "<key>"   # session only, never commit

npm run radio:catalog          # default time subset (cheaper)
npm run radio:catalog:full     # all clock samples × units
npm run radio:tts:dry          # character estimate, no spend
npm run radio:tts              # bake missing/changed only
npm run radio:tts:full         # full matrix then bake
```

Add a new status pattern once in `speech_rules.json` → every unit × every time appears on the next catalog.

## Spoken vs match

- **spoken** (TTS `text`): radio-friendly pronunciation using **LAPD phonetics** for letters  
  - `3A12` → **three Adam twelve**  
  - `3S1` → **three Sam one**  
  - `3T1` → **three Tom one**  
  - Streets: `fourteen hundred block Ocean Drive`, priorities: `Priority one`
- **match**: caption fragments the CAD/app may emit — `3A12`, `P1`, `1400 block Ocean Drive` (still alphanumeric on glass)

### LAPD phonetic alphabet (lexicon)

A Adam · B Boy · C Charles · D David · E Edward · F Frank · G George · H Henry · I Ida · J John · K King · L Lincoln · M Mary · N Nora · O Ocean · P Paul · Q Queen · R Robert · S Sam · T Tom · U Union · V Victor · W William · X X-Ray · Y Yellow · Z Zebra

## Voices (12)

See **[CAST.md](./CAST.md)** for the named roster:

| | |
|--|--|
| **Dave** `B4mQ18VPQVeQGS9ZcnZy` | Primary A-console (you) |
| **Sarah** `EXAVITQu4vr4xnSDxMaL` | Relief dispatch |
| **Mark** `UgBBYS2sOqTuMpoF3BR0` | 3A12 + 3S1 (premium) |
| **Valley** `Fk67DVZyDsJmZYzcob1A` | 3A21 Collins |

No Charlie (British).

### Model + delivery (v3)

- Model: **`eleven_v3`**
- Dispatch lines: **`[calm] [dispatch]`** prefix  
- Field units: **`[calm]`** prefix  
- Tags are TTS-only; CAD match keys stay plain (`3A12 copy, en route`)

## Law

- Audio plays captions / matched lines only — never invents grade outcomes
- Keyboard checkride works if clips missing (key-up / roger fallback)
- Training fiction only — not a real PSAP channel
