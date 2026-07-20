# Radio TTS bake status

**Updated:** 2026-07-19 (live full-matrix bake in progress)  
**Continue full matrix:** YES — `npm run radio:tts:full` (skips cached; priority-ordered)

## Progress (live)

| Metric | Value |
|--------|------:|
| Catalog lines (full) | **1515** |
| Playable in app (manifest) | **~570+** (climbing) |
| Approx complete | **~38%+** of full matrix |
| **Trainer (Dave) clips** | **12 / 12 baked** |
| **Responding ACKs** | **20 / 20** ✅ |
| **CALLER / DISPATCH / EMERGENCY / BOLO / UPDATE** | content matrix preferred first |

## Bake physics (current script)

- Priority order: trainer → caller → emergency → dispatch → bolo/update → responding → ack → query → system → status
- Crash-safe: flushes playable manifest every **12** new clips (merge prior)
- Fingerprint invalidates stale turbo bakes without v3 tags
- Secrets: `ELEVENLABS_API_KEY` from `.env` only (never commit)

## Wired now

- Clean **trainer bus** (studio coach — no RF grit)
- **Emergency heat** radio chain + deeper music duck + alert
- **Step-on** crackle when TX cuts TX
- Speech attack/release envelope
- Channel SFX via **Web Audio** (snappy key-up)
- `prewarmHot()` on BEGIN into watch
- Dispatch / unit / caller matches from on-disk clips
- Sim unit ACKs emit `{callsign}, responding.` → baked `unit_*_responding`

## Resume bake

```powershell
cd C:\Users\coldb\SECTOR-305
npm run radio:tts:full
```

## Responding units — complete

All 10 units × responding + responding_enroute = **20/20** baked.
