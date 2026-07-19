# UI acceptance script (M16) — Phase 0

**Environment:** `npm run dev -w @sector305/web` → http://localhost:3050  
**Keyboard path:** required for full checkride (no mic).

| # | Step | Pass criteria |
|---|------|----------------|
| 1 | Load app | Shell visible (South Beach swag), no neon CAD yet |
| 2 | Read disclaimer | Not a real cert / not APCO language present |
| 3 | OPEN WATCH · A07 | Clinical glass loads (EFIS colors) |
| 4 | Top bar | Console ID A07, sector, sim clock, seed |
| 5 | Incident queue | ≥2 CFS; P-codes colored; loc confidence shown |
| 6 | Select cfs-001 | Form shows nature, priority, location freeform |
| 7 | Verify → 1400 Ocean | Confidence becomes verified |
| 8 | Set nature ROBBERY-IP | Nature updates |
| 9 | Set priority P1 | Priority P1 |
| 10 | Flag WEAPONS + BACKUP | Flags listed |
| 11 | Edit radio caption with weapon | Caption retained |
| 12 | Dispatch 2× AVL patrol | Units DIS; radio log line; live grades if any |
| 13 | Sim unit ACKs | Readback warning clears; units ER |
| 14 | Sim on scene | Units OS; CFS WORKING |
| 15 | Clear GOA | Units AVL; CFS cleared |
| 16 | +30s on second CFS optional | Clock advances |
| 17 | Zone map panel | Zones listed; confidence legend; no truth pin label |
| 18 | Export SessionRecord | Downloads/copies JSON with commands |
| 19 | End / Debrief | Evaluation form; hard/soft lists; disclaimer |
| 20 | Keyboard-only | Entire path usable without speech APIs |

**Fail if:** neon accents dominate glass; confetti; STT required; truth coordinates shown as “truth”.

**Sign-off:** _date_ / _tester_
