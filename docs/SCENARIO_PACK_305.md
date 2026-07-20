# SECTOR 305 — Scenario pack format (`.305`)

**Status:** v1 standard  
**Goal:** one obvious way to author, improve, ship, and open scenarios — folder for git, single file for desktop / share.

---

## Why `.305`

| Need | Answer |
|------|--------|
| Easy to improve | Author as a **folder** (diffable JSON + notes) |
| Easy to ship | Pack to **one file** `Something.305` |
| Standard | Fixed envelope schema `s305.scenario_pack.v1` |
| Not a snowflake | Still plain JSON under the hood (no proprietary binary) |

Think: `.docx` is a zip of XML; **`.305` is a JSON envelope of a scenario folder**. Later we can zip-wrap media without changing the mental model.

---

## Two forms (same content)

### 1. Authoring folder (repo default)

```text
scenarios/checkride_a07_ocean_robbery_v1/
  scenario.json          # required — engine document
  EXPECTED.md            # optional — author / grader notes
  session_pass.json      # optional — golden pass SessionRecord
  session_fail.json      # optional — golden fail SessionRecord
  assets/                # optional — future bed clips, map overlays
```

Keep editing **folders in git**. Never commit giant opaque binaries as the only source of truth.

### 2. Ship file `*.305`

UTF-8 JSON (pretty-printed for diffability until media forces zip):

```json
{
  "schema": "s305.scenario_pack.v1",
  "format": "305",
  "packedAt": "2026-07-20T03:00:00.000Z",
  "manifest": {
    "id": "checkride_a07_ocean_robbery_v1",
    "version": "1.0.0",
    "kind": "checkride",
    "packId": "miami-a07-police-v0",
    "seed": 305001,
    "title": "A07 Ocean corridor — robbery with bad initial address",
    "adversarialTags": ["C1", "C2", "C4", "C5"],
    "contentNotes": ["weapons-in-progress CAD text only", "no-gore"]
  },
  "scenario": { "...same as scenario.json..." },
  "notes": "optional markdown from EXPECTED.md",
  "goldens": {
    "pass": { "...session_pass.json..." },
    "fail": { "...session_fail.json..." }
  },
  "assets": {}
}
```

**File extension:** `.305`  
**MIME (desktop):** `application/vnd.sector305.scenario+json`

---

## Manifest rules (stable public face)

| Field | Required | Notes |
|-------|----------|--------|
| `id` | yes | Stable slug; matches folder name when in repo |
| `version` | yes | Semver string |
| `kind` | yes | `checkride` \| `watch` \| `academy` |
| `packId` | yes | Doctrine pack (e.g. `miami-a07-police-v0`) |
| `seed` | yes | Integer sim seed |
| `title` | yes | Operator-facing |
| `adversarialTags` | no | C1–C10 etc. |
| `contentNotes` | no | Policy / tone tags |
| `durationMs` | no | Soft watch length |

Desktop “Open scenario…” only needs **manifest** to list cards; full `scenario` loads on select.

---

## How to improve a scenario (happy path)

1. **Copy** a folder under `scenarios/` (or unpack a `.305`).
2. Edit `scenario.json` (title, tags, timeline, pass bar).
3. Optional: update `EXPECTED.md`, goldens.
4. **Validate:** `npm run scenario:validate -- scenarios/my_scenario`
5. **Pack:** `npm run scenario:pack -- scenarios/my_scenario`
6. Drop `exports/scenarios/my_scenario.305` onto desktop / share / library.

Engine materialization (A07 library builders) stays the runtime source for rich unit/incident graphs until a scenario is fully self-contained inline (`units` / `incidents` / `timeline` in JSON). Packs always carry the **authoring document** even when the library still materializes bodies.

---

## CLI

```powershell
# Validate folder or .305 file
npm run scenario:validate -- scenarios/checkride_a07_ocean_robbery_v1
npm run scenario:validate -- exports/scenarios/checkride_a07_ocean_robbery_v1.305

# Pack folder → exports/scenarios/<id>.305
npm run scenario:pack -- scenarios/checkride_a07_ocean_robbery_v1

# Unpack .305 → scenarios/<id>/ (refuses overwrite unless --force)
npm run scenario:unpack -- exports/scenarios/checkride_a07_ocean_robbery_v1.305

# List all authoring folders
npm run scenario:list
```

---

## Versioning

| schema | Meaning |
|--------|---------|
| `s305.scenario_pack.v1` | JSON envelope above |
| `s305.scenario_pack.v2` | Reserved: zip container + binary assets (same logical paths) |

Readers must reject unknown `schema` values rather than half-load.

---

## Non-goals (v1)

- Encrypted / DRM packs  
- Live multiplayer scenario sync  
- Replacing doctrine packs (`.305` is **scenario**, not full A07 doctrine)  
- Suno / third-party metadata in assets  

---

## Doctrine

Scenarios are **training fiction**. No real CFS, no real radio IDs, no cert claims.
