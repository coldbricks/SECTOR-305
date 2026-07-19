# Radio TTS bake status

**Updated:** 2026-07-19 (wired partial bank + trainer for play)  
**Continue full matrix later:** YES

## Progress

| Metric | Value |
|--------|------:|
| Catalog lines (full) | **1495** |
| Playable in app (manifest) | **~340** |
| Still missing | **~1155** |
| **Trainer (Dave) clips** | **12 / 12 baked** |
| Approx complete | **~23%** of full matrix |

## Wired now

- Dispatch / unit / caller matches from on-disk clips
- Channel SFX (key-up, phone seize, static beds)
- **Academy COACH plays Dave trainer** via `trainerClipId` on walkthrough steps
- Soft-band debrief, 17 scenarios

## Resume full bake tomorrow

```powershell
cd C:\Users\coldb\SECTOR-305
npm run radio:tts
```

Skips existing files. `.env` holds API key (gitignored).

## TODO — unit “responding” (DO NOT FORGET)

Units must answer dispatch with **responding**, not only “copy, en route”:

| Spoken (LAPD) | Caption match |
|---------------|----------------|
| `three Adam twelve, responding.` | `3A12, responding.` |
| `three Adam twelve, responding, en route.` | `3A12, responding, en route` |

- Patterns already in **`speech_rules.json`**: `responding`, `responding_enroute`
- UI **Sim unit ACKs** now emits `{callsign}, responding.`
- **Next bake must produce** `unit_*_responding.mp3` for every unit (and optional `responding_enroute`)

```powershell
npm run radio:catalog:full   # expands new patterns
npm run radio:tts            # bakes missing only
```
