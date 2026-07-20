# PREMIER CAD User Guide 6.7.8 — research brief (SECTOR 305)

**Source:** `C:\Users\coldb\Downloads\CAD6_7_8UserGuide.pdf`  
**Product:** Motorola **PREMIER CAD** (classic PSAP workstation CAD)  
**Doc:** User Guide Version **6.7.8** · March 2009 · 0607-01501 · **614 pages**  
**Build date (manual):** February 25, 2009  

## Legal / product boundary

- Motorola copyrighted commercial documentation. Use for **fiction training product IA** only.
- Do **not** reproduce command strings, screenshots, or trademarks in shipping UI as “Premier CAD.”
- SECTOR 305 remains fictional (kill list: no fake cert, no production CAD replacement).
- Companion study: PremierOne **Mobile** APK recon (`PREMIERONE_MOBILE_RECON.md`) = field client; **this guide** = **console / A-position** CAD.

## What this document is

The operator bible for the **classic multi-monitor PREMIER CAD client**:

| Piece | Role |
|-------|------|
| **Work monitor** | Forms + dual (or more) command lines / work areas |
| **Status monitor** | PREMIER **AWW** — unit/incident status boards |
| **ATM / TMD** | Optional map monitors (Advanced Tactical Mapping / older TMD) |
| **Keyboard-first** | Navigation + **function keys** + typed **command codes** (II, ID, US…) |
| **Server** | PREMIER CAD server (doc references HP NonStop connection status) |

This is the cultural DNA of “real CAD feels keyboardy and multi-window,” not a single React panel.

## Workstation model (Ch. 2) — highest IA value

### Hardware layout (typical)

1. **Work monitor** — PREMIER CAD forms / command lines  
2. **Status monitor** — AWW status of units & incidents  
3. Optional **3rd/4th** — ATM map  
4. **Keyboard primary**, mouse optional  
5. Windows Classic mode required on XP-era deployments  

### Work monitor anatomy

| Element | Behavior |
|---------|----------|
| **Command line(s)** | Type command → **F10** sends to system; up to **160** chars; scrolls |
| **Work areas** | **Minimum 2** open; **Ctrl+D** adds empty areas (max 9 empty); unlimited in-use; **CW** / **CW.*** close |
| **Recent command list** | Last **19** commands (dropdown / Alt+↓) |
| **Menu bar** | Hidden; **Alt** toggles |
| **Status bar** | CAD Ready/Success/Failure · cursor field · mail/query counters · clock · **Console ID** · **Logon Position** (Call Taker / Dispatcher / Master / Supervisor) · Production/**Training** · ATM · AVL · connection icon |

### Status bar message counters (product language)

| Code | Meaning |
|------|---------|
| **Q** | Query answers (state/local/national systems) |
| **C** | Console messages (other consoles, MDTs, high-priority, comms) |
| **P** | Personal email |
| **T** | Task-group messages |
| **CE / PE** | External console / personal mail |

### Status monitor (AWW)

- Unit & incident status display  
- **Flags** and **status colors** (agency-configured)  
- Refresh of AWW display  

### Navigation (keyboard culture)

- Field-to-field keyboard nav (not mouse-first)  
- **Function keys** for Initiate / Update / Unit Status / Display 911 / etc. (12- or 16-key layouts)  
- Command **identifiers** (dotted fields: `II.…`, `ID.…`, `US.…`)  

## Command-driven ops model (core loop)

Commands are **short codes + ordered identifiers**, not only GUI clicks.

### Core command vocabulary (from Appendix A samples + TOC)

| Code | Name | Ops meaning for SECTOR |
|------|------|------------------------|
| **II** | Initiate Incident | Create CFS (call-taker / field) |
| **ID** | Incident Dispatch | Assign units / dispatch |
| **IU** | Incident Update | Update CFS (comments / form) |
| **US** | Unit Status | Status change (field loop heart) |
| **IR** | Incident Recall | Pull history |
| **IN** | Incident Display | Show CFS |
| **IS** | Incident Summary | Active/pending/stacked summary |
| **FR** | Free Units | Clear units off incident |
| **CS** | Call Stacking | Stack/reorder on a unit |
| **CI** | Clone Incident | Linked multi-agency / multi-CFS |
| **BB** | Bulletin Board / BOLO | BOLO traffic |
| **CC** | Control Console | Area ownership / transfer between consoles |
| **AP** | Activate Plan | Agency plan swap |
| **CM** | Crisis Mode | Agency crisis posture |
| **CT** | Console Talkgroups | Radio channel groups on console |
| **CA** | Call Alert | Selective radio call |
| **LL** | Line Up List | On-duty lineup |
| **ON / UF** | On / Off duty | Law unit duty |
| **RC** | Roll Call | Roll call check |
| **RD** | Radio Data Search | Radio assignment lookup |

### Incident lifecycle (chapters 6–8)

```text
Initiate (II / F-key / 911 / form / traffic stop)
  → Address verification / common place / Soundex
  → Dispatch (ID / Dispatch key / form pages)
  → Stack / preassign / borrow units / primary unit
  → Update (IU / F3 / forms)
  → Status hygiene (US)
  → Close (disposition, free units, clear route)
  → Audit trail / recall / premises / BOLO
```

### Multi-discipline

- **Law** vs **Fire/EMS** dispatch forms (multi-page)  
- Split crew, cover stations, toning/paging, SSMP, tear-and-run  
- ProQA appendix for medical protocol handoff  

## Address model (Ch. 3)

PREMIER treats location as a **typed language**:

- Partial / whole street  
- Common place name  
- Intersection  
- Alias  
- Lat/long  
- Alarm number  

SECTOR already has freeform + zone + verify confidence — deepen **intersection / common place / alias** fiction without copying Motorola fields verbatim.

## Implications for SECTOR 305 (patterns only)

### Already aligned

- Keyboard-first path (M16)  
- Console ID / sector / sim clock / training fiction mode  
- Dual concept of queue + unit board + map  
- Command-ish radio captions  
- Training vs production honesty  

### Gaps vs classic PREMIER density

| PREMIER concept | SECTOR opportunity (fiction) |
|-----------------|------------------------------|
| Dual work areas + command lines | Split CAD sheet + radio draft as “work areas”; optional second CFS pin |
| AWW status monitor | Stronger unit board + incident summary strip (not only queue list) |
| Command codes + F10 | Optional “command bar” accepting SE305 shorthand (`D 3A12 3A14`, `US ER`) → maps to PlayerCommand |
| Status bar counters (Q/C/P/T) | Ops strip already has OPEN/HIGH/SLA — add **MSG** / **BOLO** counters as fiction |
| Logon position | Role switch: Call-taker / A-console / Supervisor tracks (roadmap) |
| Call stacking on unit | Unit stack UI when multi-CFS on one unit |
| Clone / associate incidents | Multi-CFS link for concurrency checkrides |
| Audit trail form | Debrief AAR already points this way — deepen chronological audit |
| Function keys | Document F-key map that matches our hotkeys (not Motorola’s exact map) |

### Explicit non-goals

- Do not implement full PREMIER command language as a clone  
- Do not label UI “PREMIER” / Motorola  
- Do not require HP NonStop / real radio systems  

## Relationship: PREMIER CAD vs PremierOne Mobile

| | PREMIER CAD 6.7.8 (this PDF) | PremierOne Mobile APK |
|--|------------------------------|------------------------|
| Era | Classic console CAD (~2009 doc) | Modern field handheld (2026.2) |
| User | Call-taker / Dispatcher / Supervisor | Field unit |
| UI | Multi-monitor, command line, AWW | Dashboard icons, WebView forms, ArcGIS |
| Value to SE305 | **A-console workflow density** | Field status + object model |

Together they sandwich SECTOR: **we train the middle seat** with both languages in mind.

## Suggested SECTOR implementation order

1. **Command bar (fiction)** — short codes → existing `PlayerCommand` (no new grade law)  
2. **AWW-style unit board** — denser status columns (beat, stack depth, overdue)  
3. **Second work area** — pin two CFS without losing radio draft  
4. **Status bar v2** — Console ID · Position · Training · connection · counters  
5. **Stack UI** — when unit has >1 CFS  

## Local notes

- PDF not copied into repo (copyrighted; large).  
- Scratch extracts may live under `docs/research/_cad678_*` — keep out of public product claims.  
- Full TOC: Ch 1–18 + App A (commands/F-keys) + App B (ProQA).  

## Observer

- Opened: 2026-07-19  
- Method: PDF text extract (pypdf) + TOC/list-of-tables + Ch.2 workstation + App.A command samples  
- Pages: 614  
