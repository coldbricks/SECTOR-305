# WAVE-2026-07-19 — audio-max-enhance

**Status:** OPEN  
**Created:** 2026-07-19  
**Repo:** `C:\Users\coldb\SECTOR-305`  
**MAX COMPUTE:** ON  

## Scope (one sentence)

Finish the ElevenLabs radio-voice full matrix toward 100% playable coverage and deepen the live channel mixer (trainer bus, priority duck, step-on, SFX WebAudio, crash-safe bake) so SECTOR 305 audio feels certification-console, not toy.

## Non-goals

- STT / mic training validity (still off per doctrine)
- New scenario content beyond audio wiring
- OST track remaster / new music composition
- Store packaging

## Ownership

| Owner | Paths | Role |
|-------|-------|------|
| Grok | `scripts/elevenlabs-radio.mjs`, `packages/web/src/audio/**`, `docs/waves/WAVE_2026-07-19_audio_max.md`, `packages/web/public/audio/radio-voice/BAKE_STATUS.md` | builder + integrator |
| Grok (separate pass) | typecheck / tests / dry-run coverage | refuter |

## Frozen interfaces

- `s305.radio_voice_manifest.v1` clip shape (`id`, `file`, `match`, `kind`, …)
- Channel SFX ids (`radio_key_up`, `phone_line_seize`, …)
- Public paths under `/audio/**`
- Captions remain source of truth; audio is a view

## Acceptance commands

```text
npm run typecheck
npm test
npm run radio:tts:full:dry   # cached/playable counts move toward full catalog
```

## Barriers

| Barrier | Why required |
|---------|----------------|
| Bake wall-clock | ElevenLabs rate + character budget — runs background, skips cached |
| none for code | Mixer/code path independent of bake completion |

## Dispatch plan

- Simultaneous: (1) full-matrix bake background (2) mixer enhancements in web audio stack
- Verify side: typecheck + core tests after code; dry-run coverage after bake progress

## Artifacts expected

- Higher playable clip count in `radio-voice/manifest.json`
- Updated `BAKE_STATUS.md`
- Enhanced `radioSpeech.ts` / `channelSfx.ts` / bake prioritization

## Ledger (live)

### Evidence

- Arm: EDGE + ARMORY MAX COMPUTE ON (session)
- Baseline: catalog **1515**, playable **498**, responding **10/20**
- Live bake: playable **~570+**, responding **20/20** ✅, trainer 12/12
- Mixer: clean trainer bus, emergency heat, step-on, WebAudio SFX, prewarmHot, priority duck
- Typecheck green; core tests **113/113** pass
- Suno scrub already shipped (`12cdd5e`)

### Open risks

- ElevenLabs quota / rate limits mid-bake (~1000 remaining)
- Large binary commit size for remaining mp3s

### Close

- Observer:  
- Commit:  
- Result: OPEN (bake continues)  

