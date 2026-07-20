# SECTOR 305 — Desktop (Windows)

Native shell around the same A-console UI. **Download-and-install `.exe` is the goal.**

## Outputs

| Artifact | What |
|----------|------|
| `SECTOR 305-0.1.0-win-x64.exe` | **NSIS installer** — pick folder, Start Menu + desktop shortcut |
| `SECTOR 305-0.1.0-portable.exe` | Portable single-file (no install) |

Built under `packages/desktop/release/`.

## Build installer (from repo root)

```powershell
cd C:\Users\coldb\SECTOR-305
npm install
npm run desktop:dist
```

That will:

1. Build `@sector305/core` + Vite web `dist`
2. Run **electron-builder** (NSIS + portable)

## Dev (hot UI + Electron chrome)

```powershell
# terminal A
npm run dev

# terminal B
npm run desktop:dev
```

## Notes

- Training fiction only — not a real CAD / radio console / cert.
- First installer builds download Electron binaries (~100MB cache); later builds are faster.
- Code signing is **off** by default (`signAndEditExecutable: false`) so SmartScreen may warn until you add a cert.
- UI is the same pack as the browser; audio/radio matrix ships inside `app-ui`.
