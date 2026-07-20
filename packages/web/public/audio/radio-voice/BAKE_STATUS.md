# Radio TTS bake status

**Updated:** 2026-07-20  
**Full matrix:** **COMPLETE**

## Progress

| Metric | Value |
|--------|------:|
| Catalog lines (full) | **1515** |
| Playable in app (manifest) | **1515** |
| Complete | **100%** |
| Failed last pass | **0** |
| Trainer (Dave) | **12 / 12** |
| Responding ACKs | **20 / 20** |
| CALLER | **18** |
| DISPATCH | **26** |
| ACK | **580** |
| STATUS | **790** |
| QUERY / SYSTEM / BOLO / UPDATE / EMERGENCY | full |

## Bake physics

- Priority order: trainer → caller → emergency → dispatch → bolo/update → responding → ack → query → system → status
- Crash-safe manifest flush every 12 clips
- Retries: exponential backoff on ECONNRESET / 429 / 5xx
- Continue-on-fail (none needed last full pass)
- Secrets: `ELEVENLABS_API_KEY` from `.env` only

## Resume (if catalog grows)

```powershell
cd C:\Users\coldb\SECTOR-305
npm run radio:tts:full
```

Skips cached fingerprints. Force re-bake: `npm run radio:tts:force` (scoped) or `--force` on full.
