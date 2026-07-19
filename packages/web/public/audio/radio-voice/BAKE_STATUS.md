# Radio TTS bake status

**Updated:** 2026-07-19 (checkpoint — bake interrupted for project switch)  
**Continue full matrix:** YES — `npm run radio:tts:full` (skips cached)

## Progress

| Metric | Value |
|--------|------:|
| Catalog lines (full) | **1515** |
| Playable in app (manifest) | **498** |
| Still missing | **1017** |
| Approx complete | **~33%** of full matrix |
| **Trainer (Dave) clips** | **12 / 12 baked** |
| **Responding ACKs** | **10 / 20** (3A12–3A30 done; 3A31, 3A40, 3A41, 3S1, 3T1 pending) |

## Wired now

- Dispatch / unit / caller matches from on-disk clips
- Channel SFX (key-up, phone seize, static beds)
- Academy COACH plays Dave trainer via `trainerClipId`
- Sim unit ACKs emit `{callsign}, responding.` → matches baked `unit_*_responding` where present
- Soft-band debrief, 17 scenarios

## Resume bake

```powershell
cd C:\Users\coldb\SECTOR-305
npm run radio:tts:full
```

Skips existing files. `.env` holds API key (gitignored).  
After finish (or interrupt), rebuild playable manifest if bake was killed mid-run:

```powershell
# bake script writes manifest on clean exit; if killed mid-pass, re-run dry-run won't refresh —
# prefer completing a short `npm run radio:tts:full` pass or re-run the disk rebuild helper used at checkpoint.
```

## TODO — remaining responding units

| Spoken (LAPD) | Caption match | Status |
|---------------|----------------|--------|
| `three Adam twelve, responding.` | `3A12, responding.` | baked |
| `three Adam fourteen, responding.` | `3A14, responding.` | baked |
| `three Adam twenty-one, responding.` | `3A21, responding.` | baked |
| `three Adam twenty-two, responding.` | `3A22, responding.` | baked |
| `three Adam thirty, responding.` | `3A30, responding.` | baked |
| `three Adam thirty-one, responding.` | `3A31, responding.` | **pending** |
| `three Adam forty, responding.` | `3A40, responding.` | **pending** |
| `three Adam forty-one, responding.` | `3A41, responding.` | **pending** |
| `three Sam one, responding.` | `3S1, responding.` | **pending** |
| `three Tom one, responding.` | `3T1, responding.` | **pending** |

(+ matching `responding_enroute` for each)
