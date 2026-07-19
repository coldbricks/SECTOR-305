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
- App file: `shell-theme.wav` (~32 MB full song)

## Credits (in app)

- **Title:** Dispatch in Miami  
- **Artist:** David Lombardo  
- **Credit line:** Guitar — David Lombardo  

Edit `SHELL_TRACK_META` in `src/audio/shellMusic.ts` if title/credit text should change.

## Behavior

- Prestige shell **listening deck**: play / pause / restart / seek / volume / optional loop
- Spectrum visualizer + rotating “while you listen” prompts
- Starts after a user gesture (browser autoplay policy)
- **BEGIN** transitions the song into an ultra-low watch bed beneath boot SFX + glass ambient
- The watch bed ducks automatically under dispatch and unit radio traffic
- The console **BED** control lets the operator disable scenario music independently
- SFX mute and theme mute are separate
- Missing file → deck shows standby copy, no crash

## Tips

- Export a full master (any length). Loop is **off** by default so the ending can land.
- ~−14 to −12 LUFS streaming-ish; in-app default volume ~55%
- Keep radio SFX on their own bus (already separate)

When it’s done: export → `shell-theme.mp3` → hard-refresh → hit **PLAY**.
