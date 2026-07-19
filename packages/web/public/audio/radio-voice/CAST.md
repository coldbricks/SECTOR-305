# SECTOR 305 · A07 radio cast

Fiction channel. Not a real PSAP. Voices chosen for *listenability under load*.

| Air name | Voice ID | Role on the glass |
|----------|----------|-------------------|
| **Dave** | `B4mQ18VPQVeQGS9ZcnZy` | **You.** Primary A-console dispatch. |
| **Sarah** | `EXAVITQu4vr4xnSDxMaL` | Relief / training console. Mature operator gold. |
| **Mark** | `UgBBYS2sOqTuMpoF3BR0` | **3A12** Ocean lead + **3S1** when supervisor rolls. Premium, spend it. |
| **Valley** | `Fk67DVZyDsJmZYzcob1A` | **3A21** Collins nightlife — fun without breaking radio discipline. |

Supporting field: Josh / Sam / Clyde / Callum / Drew / Harry on the other posts.  
**Banned:** Charlie (British) — out of Miami fiction.

## Delivery (ElevenLabs v3)

| Who | Tags |
|-----|------|
| Dave / Sarah (dispatch) | `[calm] [dispatch]` |
| Field units | `[calm]` |

Callsigns: **LAPD phonetics** — `3A12` → *three Adam twelve*.

## 911 callers (phone path)

| Voice | Use |
|-------|-----|
| **Valley** | Young / nightlife frantic callers — knife, robbery, loud club |
| **Sarah** | Shaken adult, domestic (training-safe), welfare, crash |
| **Mark** | Male witness — shots, armed subject, port, alarm |

v3 tags per line: `[frantic] [scared]`, `[urgent]`, `[whispering]`, etc.  
Playback is **phone-line** flavor (not RF), ducks the score bed when CT notes / knowable cues land.

Content law: CAD-safe language, no gore tourism, no shock-for-shock.

## Why this is fun

- You hear **yourself** launch units.
- Sarah is the “senior next to you” texture on alt dispatches.
- Mark sounds like the unit that *actually* shows up first on Ocean.
- Valley on Collins is the nightlife sector personality without meme radio.
- Callers interrupt the calm — pressure is *heard*, not just read.

Edit IDs in `lexicon.json` → `npm run radio:tts`.
