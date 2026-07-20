# WAVE-2026-07-19 — instrument-gui-polish

**Status:** VERIFY  
**Created:** 2026-07-19  
**Repo:** `C:\Users\coldb\SECTOR-305`  
**MAX COMPUTE:** ON  

## Scope (one sentence)

Make the live A-console look like a certification instrument (CAD sheet tabs, map instrument rail, formal AAR debrief) for serious game-design evaluation — sexy shell, clinical glass, zero arcade chrome.

## Non-goals

- New scenario content
- STT / mic path
- Store packaging

## Ownership

| Owner | Paths | Role |
|-------|-------|------|
| Grok | `packages/web/src/App.tsx`, `components/CfsCadSheet.tsx`, `SectorMap.tsx`, `styles.css` | builder |
| Grok subagent | styles append (CAD/AAR/map) | parallel CSS |

## Acceptance

```text
npm run typecheck
npm test
# Manual: OPEN WATCH → CAD tabs NATURE/LOCATION/FLAGS/RADIO work
# Debrief looks like form S305-AAR, not win screen
# Map shows zone chips + scale + GRID readout
```

## Ledger

### Evidence

- Instrument desk tokens + soft keys (`803ab56`)
- CAD sheet component + tabbed form
- AAR debrief restructure (letterhead, tables, signature block)
- Map zone legend + scale bar + GRID status
- Typecheck green; core **113/113**

### Close

- Observer: Grok  
- Result: VERIFY → ship after manual glance  
