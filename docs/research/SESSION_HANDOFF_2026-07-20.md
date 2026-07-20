# SESSION HANDOFF — SECTOR 305 (clear-context save)

**Date:** 2026-07-20  
**Repo:** `C:\Users\coldb\SECTOR-305` · branch `master`  
**MAX COMPUTE:** ON (user standing order for this workstream)  
**Direction lock:** **Modern** Motorola stack — **CommandCentral AXS** air-side language + clinical instrument CAD (not 2009 PREMIER Win32 clone, not arcade neon)

---

## Product bar

- **OST** is “fucking insanely good” — do **not** muck score bed volume/coupling to “help” gameplay. Score plays normally.
- **Gameplay + glass** must keep up with that bar.
- Fiction trainer only: no fake certs, no production CAD, no MSI trademarks in product UI.

---

## Shipped recently (commits to know)

| Commit | What |
|--------|------|
| `0c65d3e` | **Radio voice 1515/1515 (100%)** ElevenLabs full matrix |
| `05ab8e5` | Gameplay: LIVE sim (Space), staged CFS ring-in, SLA meters, field radio auto after dispatch |
| `e7dfa23` / `803ab56` | Instrument desk GUI · CAD sheet tabs · map rail · formal AAR debrief |
| `12cdd5e` | Suno scrub → David Lombardo / Coldbricks metadata on OST |
| `414cfa0` / `0b3f7b8` | CommandCentral AXS datasheets (2020 + 2025) |
| `818c49c` | PREMIER CAD 6.7.8 user guide research |
| `fc96315` | PremierOne Mobile APK recon |

**Tip of master should be ≥ `414cfa0` / later with bake.**

---

## Motorola research triad (patterns only)

| Layer | Doc | Seat |
|-------|-----|------|
| PREMIER CAD 6.7.8 | `docs/research/PREMIER_CAD_6_7_8_USER_GUIDE.md` | Console CAD / commands / dual work areas |
| PremierOne Mobile | `docs/research/PREMIERONE_MOBILE_RECON.md` | Field MDC (APK extract **gitignored**) |
| **CommandCentral AXS** | `docs/research/COMMANDCENTRAL_AXS_DATASHEET.md` | **Modern radio console — GO THIS WAY for air UI** |

**Modern direction (user chose):**

- Dark resource-**tile** channel bank, discipline colors (PD blue / Fire red / EMS green)
- Activity log columns: Time · Resource · Unit · Event
- Top radio soft row (TX / tone / freq metaphors as fiction)
- TX strip under radio
- CAD stays instrument EFIS (clinical cyan), not AXS branding
- Browser-class dense glass (AXS is Chromium-class)

---

## What’s working in-app now

- Splash + OST (Dispatch in Miami + scenario beds) · score desk
- LIVE / PAUSE sim clock (Space) · SLA bars · staged CFS arrival SFX
- CAD sheet tabs: NATURE · LOCATION · FLAGS · RADIO
- Field unit auto radio: responding → en route → on scene after dispatch
- Full TTS bank: trainers, callers, dispatch, ACKs, STATUS matrix
- Channel SFX WebAudio · trainer clean bus · emergency heat
- AAR debrief form S305-AAR

**Run:**

```powershell
cd C:\Users\coldb\SECTOR-305
npm run dev
# typically http://127.0.0.1:3050
```

**Bake (if catalog grows):** `npm run radio:tts:full` (skips cached; retries on network blip)

---

## Next level — prioritized backlog

### P0 — Modern air panel (AXS-inspired, original chrome)

1. **Channel bank → resource tile grid** (folders + discipline colors + badges)
2. **Activity log** restyle (Time · Resource · Unit · Event)
3. **TX / present strip** under radio caption (training-only timeout feel)

### P1 — CAD density (PREMIER patterns, modern skin)

4. Fiction **command bar** (`D 3A12 3A14` → DispatchUnits)
5. **AWW-style unit board** (status columns denser)
6. Unit **status change modal** (AVL→DIS→ER→OS)
7. Priority-tinted queue rows (clinical, not neon)

### P2 — Gameplay pressure

8. Second work area / dual CFS pin
9. Call stack on unit when multi-CFS
10. Escalating concurrency soft marks before hard abandon (doctrine-safe)

### P3 — Pitch / ship

11. 1440p screenshot pack for design-company demos
12. One-pager `DESIGN_STUDIO_BRIEF.md`

---

## Paths & secrets

- Repo: `C:\Users\coldb\SECTOR-305`
- Edge arm: `C:\Users\coldb\edge` · ARMORY + MAX COMPUTE gate
- ElevenLabs: `.env` `ELEVENLABS_API_KEY` (never commit)
- PremierOne APK extract: `docs/research/premierone_mobile_xapk/` gitignored
- OST retag: `node scripts/retag-music-coldbricks.mjs --zip`

---

## User prefs (binding)

- MAX COMPUTE ON when armed — no thrift for tokens/agents
- OST ownership: David Lombardo / Coldbricks only (no Suno metadata)
- Gameplay improvements ≠ score bed automation
- **Modern** console look (AXS-era), not arcade, not pure 2009 Win32 PREMIER

---

## Next session trigger (paste)

```
Follow SECTOR 305 handoff: docs/research/SESSION_HANDOFF_2026-07-20.md
Working repo: C:\Users\coldb\SECTOR-305
MAX COMPUTE ON.
Direction: modern CommandCentral AXS air-side + clinical CAD.
Next: P0 channel bank tile grid + activity log + TX strip.
```
