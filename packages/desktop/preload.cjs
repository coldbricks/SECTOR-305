/**
 * Preload bridge — minimal surface for the A-console.
 * Keeps Node out of the renderer (contextIsolation + sandbox).
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sector305Desktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  /** Subscribe to File → Open scenario (.305) packs from main. */
  onOpenScenarioPack(handler) {
    const fn = (_evt, pack) => handler(pack);
    ipcRenderer.on("s305:open-scenario-pack", fn);
    return () => ipcRenderer.removeListener("s305:open-scenario-pack", fn);
  },
});
