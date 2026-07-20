/**
 * SECTOR 305 — Electron main process
 * Loads the Vite-built A-console UI as a native Windows window.
 * Training fiction only — not a production CAD or radio console.
 */
const {
  app,
  BrowserWindow,
  shell,
  Menu,
  session,
  dialog,
  ipcMain,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const isDev = process.argv.includes("--dev") || !app.isPackaged;
const DEV_URL = "http://127.0.0.1:3050";

/** UI root: packaged extraResources/app-ui, or local web/dist when unpackaged. */
function resolveUiIndex() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app-ui", "index.html");
  }
  // Dev without --dev: load local dist if present
  const dist = path.join(__dirname, "..", "web", "dist", "index.html");
  if (fs.existsSync(dist)) return dist;
  return null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1680,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#04060b",
    title: "SECTOR 305 — A-Console",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // file:// + relative assets; no remote content except optional fonts CDN
      webSecurity: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Open external links in the OS browser, not inside the trainer
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (isDev) {
    void win.loadURL(DEV_URL).catch(() => {
      const idx = resolveUiIndex();
      if (idx) void win.loadFile(idx);
      else {
        void win.loadURL(
          "data:text/html,<body style='background:#04060b;color:#e6edf5;font-family:sans-serif;padding:2rem'><h1>SECTOR 305</h1><p>Start the web dev server: <code>npm run dev</code> then re-launch desktop.</p></body>"
        );
      }
    });
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const idx = resolveUiIndex();
    if (!idx) {
      void win.loadURL(
        "data:text/html,<body style='background:#04060b;color:#ff4d42;font-family:sans-serif;padding:2rem'><h1>UI missing</h1><p>app-ui not found. Rebuild with npm run desktop:dist</p></body>"
      );
    } else {
      void win.loadFile(idx);
    }
  }

  return win;
}

async function openScenario305(win) {
  const res = await dialog.showOpenDialog(win, {
    title: "Open SECTOR 305 scenario",
    filters: [
      { name: "SECTOR 305 scenario", extensions: ["305"] },
      { name: "All files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (res.canceled || !res.filePaths[0]) return;
  try {
    const text = fs.readFileSync(res.filePaths[0], "utf8");
    const pack = JSON.parse(text);
    if (pack.schema !== "s305.scenario_pack.v1" || pack.format !== "305") {
      dialog.showErrorBox(
        "Invalid .305",
        "File is not a s305.scenario_pack.v1 pack."
      );
      return;
    }
    win.webContents.send("s305:open-scenario-pack", pack);
  } catch (e) {
    dialog.showErrorBox(
      "Failed to open .305",
      e instanceof Error ? e.message : String(e)
    );
  }
}

function buildMenu(getWin) {
  const template = [
    {
      label: "SECTOR 305",
      submenu: [
        { role: "about", label: "About SECTOR 305" },
        { type: "separator" },
        {
          label: "Open scenario (.305)…",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            const w = getWin();
            if (w) void openScenario305(w);
          },
        },
        { type: "separator" },
        { role: "quit", label: "Quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  // Harden: block navigation away from the trainer UI
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    const u = details.url;
    if (
      u.startsWith("file:") ||
      u.startsWith("devtools:") ||
      u.startsWith("data:") ||
      u.startsWith(DEV_URL) ||
      u.startsWith("http://127.0.0.1:3050") ||
      u.startsWith("https://fonts.googleapis.com") ||
      u.startsWith("https://fonts.gstatic.com")
    ) {
      cb({});
      return;
    }
    // Allow blob/media from app
    if (u.startsWith("blob:") || u.startsWith("media:")) {
      cb({});
      return;
    }
    cb({ cancel: true });
  });

  let mainWin = null;
  buildMenu(() => mainWin ?? BrowserWindow.getFocusedWindow());
  mainWin = createWindow();

  ipcMain.handle("s305:is-desktop", () => true);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWin = createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
