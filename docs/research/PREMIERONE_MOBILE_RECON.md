# PremierOne Mobile recon (Motorola) — SECTOR 305 design study

**Source (local only):** `Downloads/PremierOne+Mobile_2026.2.008+_APKPure.xapk`  
**Unpacked under:** `docs/research/premierone_mobile_xapk/` (**gitignored** — do not ship APKs)  
**Package:** `com.motorola.p1_mobile`  
**App label:** PremierOne Mobile  
**Version:** `2026.2.008` (`versionCode` 20262008)  
**SDK:** min 29 · target/compile 36  

## Legal / product boundary (read this)

- This is **Motorola Solutions PremierOne Mobile** — commercial public-safety software.
- Study purpose: **IA / fiction training console feel** for SECTOR 305.
- **Do not** clone trademarks, icons, cobalt asset art, or shipping package IDs.
- **Do not** use this as a real CAD, scrape real agency provisioning, or defeat licensing.
- SECTOR 305 remains **fictional training** (kill list: no fake APCO cert, no production CAD replacement).

## What this APK actually is

This is **PremierOne Mobile (handheld / MDC-style field app)**, **not** the full PSAP A-console desktop stack.

Field officer workflow dominates:

| Surface | Role |
|---------|------|
| Login / agency / jurisdiction | Provisioned agency pick, concurrent login limits |
| Dashboard | Cobalt icon grid (map, unit status, inbox, query, emergency…) |
| Incident list / monitor | Assigned + monitored CFS, filters, sort |
| Incident details | Comments, history, people/vehicles, attachments, disposition |
| Unit status change | Status spinner / change dialogs |
| Map | **Esri ArcGIS Runtime** map + navigation chrome |
| BOLO | List + message detail + tone |
| Queries | Query responses with **priority-colored** list items |
| Messaging | Compose / inbox |
| Self-dispatch | Menu path on incident details |
| Covert mode | In/out of vehicle + lock variants |

## Package architecture (from resources)

### Split XAPK

| File | Role |
|------|------|
| `com.motorola.p1_mobile.apk` | Base (~88 MB) |
| `config.arm64_v8a.apk` | Native libs |
| `config.en.apk` | English resources |
| `config.xxxhdpi.apk` | Density assets |

### Key Android pieces

- **7× DEX** (`classes.dex` … `classes7.dex`) — large Kotlin/Java app
- **~291 layouts** (plus land / sw600dp / w720dp variants)
- Custom views: `P1HHWebView`, `SegmentedButton`
- **Heavy WebView surfaces** for incident list / create / edit / location verification  
  → Motorola ships a lot of CAD form chrome as **HTML inside WebView**, not pure XML widgets
- Map: Esri ArcGIS Runtime (`arcgisruntime_*` layouts, `web_map_definition_default.json`)
- Firebase / Play services / ML Kit barcode scanning
- Permission bridge: `com.motorolasolutions.spg.mcmap.permission.HSM_TRANSPORT_SERVER`

### Status palette (decoded ARGB)

| Token | Color | Use |
|-------|-------|-----|
| `dark_gray_bg_color` | `#0B0E11` | Near-black instrument ground |
| `status_valid_color` | `#0099CC` | Connected / valid (cyan-blue) |
| `status_changing_color` | `#27AE60` | Status in transition (green) |
| `status_disconnected_color` | `#FBC02D` | Warn / disconnect (amber) |
| `status_emergency_color` | `#CC0000` | Emergency (hard red) |
| `p1_light_gray` | `#E7E1DC` | Light UI gray |
| `login_label_background` | `#363636` | Login chrome |

This is **clinical cold UI** — dark ground + cyan valid + amber warn + red emergency. Aligns with SECTOR 305 instrument desk (not neon club).

### Cobalt icon set (dashboard vocabulary)

`cobalt_*` drawables:

- `map`, `unit_status`, `emergency`, `inbox`, `compose_message`
- `query`, `license_plate`, `person_by_name`, `address_book`
- `field_initiation`, `traffic_stop`
- `in_vehicle` / `out_of_vehicle` / `out_of_vehicle_w_lock`
- `covert_mode_on` / `off`, `lock`, `logout`

### Incident / unit layout map (high value)

| Layout | Meaning for SECTOR 305 |
|--------|------------------------|
| `dashboardactivity` | Home icon grid (field hub) |
| `incidentlist` + `P1HHWebView` | Queue as rich list (WebView) + segmented filter bar |
| `incidentdetails` / `IncidentDetailsFragment` | CFS sheet (history, comments, attachments) |
| `incident_monitor_activity` | Secondary monitor list (title + ListView) |
| `incident_create` / `editincident` | Create/edit CFS (again WebView + footer actions) |
| `location_verification` | Verify location flow (WebView + action footer) |
| `unitstatuschange_fragment` | Unit status change (core field loop) |
| `unit_detail_activity` | Unit dossier |
| `map_activity` (+ nav / turn-by-turn) | Map is first-class, not decorative |
| `bololistitem` / bolo detail | BOLO as first-class product object |
| `login` / agency spinner / union assignment | Provisioning-heavy login |
| Fire-specific notification layouts | Multi-discipline (police vs fire) |

### Menu / capability hints

- `incident_details_menu_with_self_dispatch` — field self-dispatch is a real path  
- Incident sort / history / attachments  
- Map menu  
- Read BOLO  

### Data model breadcrumbs (from SQL strings)

Provisioning + offline tables suggest:

- `Incident_Location` (incl. what3words lat/lon/words)
- `Incident_Suspect` + RapidSOS confidence/uncertainty
- `PR_Device_Status`, `PR_E911_Call_Status`, `PR_TalkgroupStatus`
- Disposition close info (`CITATION_CODE`, `DISPOSITION`, report number flags)
- Query cascading / LSM sets per agency

**Implication:** real P1 is **agency-provisioned**, offline-capable, multi-status, multi-object (person/vehicle/attachment), not a single flat form.

## Design lessons for SECTOR 305 (fiction IA)

Translate **patterns**, invent our own chrome:

1. **Status color grammar** — cyan valid · amber degrade · green transition · red emergency (we already lean this way).
2. **Segmented filters** on lists (Assigned / Monitor / All) — map to our queue lanes, but look more “provisioned product.”
3. **Incident sheet density** — comments + history + people/vehicles + disposition as **tabs or sections**, not one scroll of buttons (our CAD sheet tabs are the right direction; deepen **history / disposition**).
4. **Unit status is a first-class modal** — not buried; field loop is status-change heavy.
5. **Map is an activity, not a wallpaper** — callouts, unit icons, nav strip (our plate already has radar/data blocks; keep instrument, add status-chip grammar).
6. **Priority-tinted rows** — high/medium priority list backgrounds (query response assets prove this language).
7. **Footer action bar** under WebView forms — primary action + secondary (Submit / Cancel pattern).
8. **Connection status** always visible somewhere (we have LIVE/PAUSED; add “link” metaphor carefully as fiction).
9. **Never** ship Motorola names, cobalt icons, or “PremierOne” strings in product UI.

## What this is *not* teaching us

- Full **A-console** multi-monitor CAD layout (this APK is mobile-first).
- Real radio stack / talkgroup law (only status + provisioning hints).
- How an agency actually provisions CAD (server-side, not in this APK).

For **dispatch-side** IA, still use our EFIS / SECTOR glass doctrine; use P1 Mobile for **field status, list density, status colors, incident object model**.

## Suggested SECTOR 305 follow-ons (gameplay/UI)

| Priority | Work |
|----------|------|
| P0 | Unit status change modal that mirrors field loop (AVL→DIS→ER→OS) with P1-like density |
| P1 | Priority-tinted queue rows (subtle, clinical) |
| P1 | Incident sheet section: **History** (already CAD notes) + **Disposition** close path |
| P2 | Dashboard “capability tiles” for training fiction (Map / Units / BOLO / Query) — original art only |
| P2 | Connection / provision strip: `SE305-A07 · FICTION LINK` |

## Local extract hygiene

```text
docs/research/premierone_mobile_xapk/   # gitignored
  com.motorola.p1_mobile.apk
  config.*.apk
  base_unpacked/
  dumps/ui_strings_interesting.txt
  dumps/layouts.txt
```

Rebuild extract:

```powershell
# from Downloads XAPK → zip copy → Expand-Archive → aapt dump
```

## Observer notes

- Opened: 2026-07-19  
- Method: XAPK unzip + base APK unzip + `aapt dump` resources/strings/xmltree  
- No runtime install / no network login attempted  
