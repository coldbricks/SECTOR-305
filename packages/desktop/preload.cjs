/**
 * Preload bridge — minimal surface for the A-console.
 * Keeps Node out of the renderer (contextIsolation + sandbox).
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("sector305Desktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
