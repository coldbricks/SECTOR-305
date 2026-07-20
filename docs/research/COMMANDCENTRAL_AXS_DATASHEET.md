# CommandCentral AXS — datasheet research (SECTOR 305)

**Source:** [Motorola CommandCentral AXS datasheet PDF](https://www.motorolasolutions.com/content/dam/msi/docs/products/command-center-software/commandcentral_axs_datasheet.pdf)  
**Local copy:** `Downloads/commandcentral_axs_datasheet.pdf`  
**Doc mark:** ©2025 Motorola Solutions · 10-2025 [EV10] · 5 pages  
**Product:** **CommandCentral AXS Dispatch Console** — radio dispatch console (ASTRO P25), not full CAD incident software  

## Legal / product boundary

- Marketing + feature datasheet for commercial radio console hardware/software.
- Study for **fiction training IA** (look/feel, resource layout, radio workflow metaphors).
- Do **not** ship Motorola / CommandCentral / ASTRO branding or claim operational radio capability.
- SECTOR 305 remains fictional PSAP **CAD trainer**; AXS is specifically a **radio dispatch console** seat.

## Positioning (what AXS is)

| Claim | Meaning for SECTOR |
|-------|--------------------|
| “Radio dispatch — modernized experience, instantly familiar” | Modern dark UI, still console-operator native |
| Purpose-built for **ASTRO® P25** | Native radio-network console, not generic softphone |
| Successor path from **MCC 7500 / MCC 7500E** | Familiar workflows; seat-by-seat migration |
| Resource-centric design | Resources (talkgroups/channels) are first-class tiles, not buried menus |
| Configurable screens | Controls, **resource folders**, toolbars per deployment |
| Ecosystem UI consistency | Same CommandCentral look across MSI apps |

**Critical distinction:** AXS is **radio console**. PREMIER CAD / PremierOne are **CAD**. Real centers often run **both** — CAD for CFS/units, radio console for air. SECTOR currently blends both metaphors on one glass; AXS teaches the **air-side panel language**.

## UI from hero screenshot (page 1)

Observable layout (marketing mock, but intentional product language):

```text
┌─ top bar: brand · GENERAL TRANSMIT · TONE · FREQUENCY · user · clock ─┐
│  Folder grids of resource tiles (color-coded by discipline)           │
│  City PD 1 | Outer PD 2 | City Fire 1 | Outer Fire 2                  │
│  EMS 1 | Outer EMS 2 | Additional talkgroups                          │
│  Each tile: lightning icon · name · subtitle · S# badge · vol/mute    │
│  Center: selected resource detail / PTT / caller alias                │
│  Right: Activity log (time · resource · unit ID · event)              │
│  Lower right: Patch / Msel stack                                      │
│  Bottom: TX timeout strip · system icons                              │
└───────────────────────────────────────────────────────────────────────┘
```

### Visual grammar

- **Deep blue-black console** (CommandCentral modern dark, not Windows XP classic PREMIER)
- **Discipline color coding:**
  - **Blue** — Police talkgroups / districts  
  - **Red** — Fire districts  
  - **Green** — EMS  
  - **Grey/blue** — additional / CG talkgroups  
- **Resource tiles** as the primary interaction (folder groups, not deep hierarchies)
- **Activity log** always visible (time-stamped radio events)
- **Patch / Multi-select** as sticky right rail
- Clock + operator identity in chrome

This is the **modern radio-side** complement to classic PREMIER CAD’s dual-monitor + command line.

## Feature tables (condensed)

### General console functionality

- General / Instant / APB transmit  
- Monitor (disable CTCSS)  
- Single select · **Multi-select (≤16 groups)** · All Mute · Acoustic Cross Mute  
- **Patch (≤16 groups)**  
- Display Radio **PTT ID with Alias**  
- Emergency Alarm · Call Alert  
- Time display · **VU meter**  
- **Activity log** · Instant Recall Recorder  
- Integrated paging encoder · Channel marker  
- **Alert tones** (≤15 per position, customizable)  
- Deploy inside **or** outside ASTRO infrastructure  

### Secure voice

- AES, DES-OFB, ADP  
- Coded/clear mode, key select, multikey, momentary override  
- Cross-mode indications/alerts  
- FIPS key storage / traffic encryption levels  

### Radio resources

**Types:** trunking talkgroup / announcement / individual / system-wide · analog conventional · MDC1200 · ASTRO conventional  

**Calls:** TG, AG, emergency, individual, system-wide, conventional PTT/emergency/selective  

**Controls:** per-resource volume, repeat, coded/clear, access priority, frequency/PL, wildcards, emergency alarm  

**Advanced signaling:** status request/display, message, enable/disable, radio check, remote monitor  

**Paging:** manual, pre-configured, group, checklist  

### Hardware sketch

- **CommandCentral Hub** B1955/B1956 (with/without PC)  
- **HP Z2 Mini** workstation option  
- Accessories: ≤8 speakers, ≤2 headset jacks, desk mic, footswitch, paging encoder, tel/headset, local logging  
- Public/private aux I/O relays (PTT, emergency, selected channel, sonalert)  

## Implications for SECTOR 305

### Already in the right family

- Dark instrument glass  
- Channel bank / radio log  
- Soft keys (R/T, etc.)  
- Activity-ish grade/radio feeds  

### Steal as *patterns* (not product clone)

| AXS pattern | Fiction SECTOR move |
|-------------|---------------------|
| Resource folders + color tiles | Channel bank as **foldered resource grid** (District / Fire / EMS fiction) with discipline colors |
| Always-on activity log | Keep radio log; style as AXS-style timestamp columns |
| Patch / multi-select rail | Optional “patch strip” for multi-channel training scenarios (later) |
| PTT ID + alias | Unit radio captions already carry callsign; show **alias chip** on TX |
| VU / TX timeout | Optional TX meter / timeout bar under radio caption (training feel) |
| Top: General Transmit / Tone / Frequency | Map to our soft keys: R/T · BED · channel select language |
| Configurable layout | Workspace prefs (map already has look/mode) — extend to radio panel |

### Explicit non-goals

- Real ASTRO encryption, patch, multikey, remote monitor  
- Claiming P25 / MCC / CommandCentral compatibility  
- Replacing CAD with radio-console-only UI  

### Product stack reminder (three MSI layers)

| Layer | Doc we have | SECTOR seat |
|-------|-------------|-------------|
| PREMIER CAD 6.7.8 | Console CAD + command line | CFS / units / command culture |
| PremierOne Mobile | Field MDC | Status, objects, cobalt field IA |
| **CommandCentral AXS** | **Radio console** | **Air: resources, patch, activity, PTT** |

SECTOR’s A-console can stay **CAD-primary** with a **radio panel that reads AXS-modern**, not PREMIER-2009 Windows.

## Suggested SECTOR UI follow-ons

1. **Channel bank refresh** — tile/folder grid, discipline colors, S# style badges (fiction numbers)  
2. **Activity log columns** — Time · Resource · Unit · Event (mirror AXS log without MSI chrome)  
3. **TX strip** — timeout / “press to present” style caption under radio (training only)  
4. **Top radio soft row** — GENERAL TX · TONE · FREQ metaphors as non-functional or sim-only controls labeled fiction  

## Observer

- Fetched: 2026-07-20  
- Method: official MSI datasheet PDF · full text extract · UI read from hero mock  
- Pages: 5  
