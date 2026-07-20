# SECTOR 305 title theme (full song)

This is a **full track**, not a 3-second sting. The shell has a listening deck
(visualizer, scrubber, credits) so people can sit with it.

## Drop file

| File | Notes |
|------|--------|
| **`shell-theme.mp3`** | Preferred |
| `shell-theme.ogg` / `.wav` / `.m4a` | Fallbacks |

## Installed track

- Source: `Downloads/Dispatch in Miami.wav`
- App file: `shell-theme.mp3` (web master; source WAV stays local)

## Credits (in app)

- **Title:** Dispatch in Miami  
- **Artist:** David Lombardo  
- **Publisher:** Coldbricks  
- **Credit line:** Guitar — David Lombardo  

Edit `SHELL_TRACK_META` in `src/audio/shellMusic.ts` if title/credit text should change.

## Metadata ownership

All music masters must ship with **David Lombardo / Coldbricks** tags only.
Strip generator watermarks (including Suno) before commit or OST zip:

```bash
node scripts/retag-music-coldbricks.mjs --zip
```

## Behavior

- Prestige shell **listening deck**: play / pause / restart / seek / volume / optional loop
- Spectrum visualizer + rotating “while you listen” prompts
- Starts after a user gesture (browser autoplay policy)
- **BEGIN** crosses the title performance into one of seventeen scenario tracks
- The watch bed ducks automatically under dispatch and unit radio traffic
- The console **BED** control lets the operator disable scenario music independently
- The score desk provides previous/next, direct selection, and bed-level controls
- Rotation persists between watches so the score does not reset to one favorite
- SFX mute and theme mute are separate
- Missing file → deck shows standby copy, no crash

## Tips

- Export a full master (any length). Loop is **off** by default so the ending can land.
- ~−14 to −12 LUFS streaming-ish; in-app default volume ~55%
- Keep radio SFX on their own bus (already separate)

## Scenario-score collection

`scenarios/` contains seventeen unique web masters derived from nineteen source
downloads. The duplicate `Chopper Run` and `Mayday Over Miami` downloads are
documented as aliases in `scenarios/manifest.json` and are not stored twice.

All scenario masters are MP3, 160 kbps, 48 kHz stereo, and loudness-normalized
for consistent low-level watch playback. They are original music owned by David
Lombardo and are not licensed under MIT. See `scenarios/LICENSE.md`.

When it’s done: export → `shell-theme.mp3` → hard-refresh → hit **PLAY**.
