#!/usr/bin/env node
/**
 * Strip ALL third-party generator metadata (esp. Suno) from SECTOR 305 music
 * masters and rewrite ownership tags to David Lombardo / Coldbricks.
 *
 * Requires ffmpeg + ffprobe on PATH.
 *
 *   node scripts/retag-music-coldbricks.mjs
 *   node scripts/retag-music-coldbricks.mjs --zip   # rebuild exports/ost zips
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  copyFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const wantZip = process.argv.includes("--zip");

const ARTIST = "David Lombardo";
const ALBUM = "SECTOR 305 (Original Soundtrack)";
const PUBLISHER = "Coldbricks";
const COPYRIGHT =
  "Copyright 2026 David Lombardo / Coldbricks. All rights reserved.";
const COMMENT =
  "Original music by David Lombardo for SECTOR 305. Coldbricks.";

function resolveBin(name) {
  try {
    const out = execFileSync(
      process.platform === "win32" ? "where.exe" : "which",
      [name],
      { encoding: "utf8" }
    );
    return out.split(/\r?\n/).find(Boolean)?.trim() || null;
  } catch {
    return null;
  }
}

const ffmpeg = resolveBin("ffmpeg");
const ffprobe = resolveBin("ffprobe");
if (!ffmpeg || !ffprobe) {
  console.error("ffmpeg and ffprobe required on PATH");
  process.exit(2);
}

function loadTitles() {
  const manPath = join(
    root,
    "packages/web/public/audio/scenarios/manifest.json"
  );
  const man = JSON.parse(readFileSync(manPath, "utf8"));
  const map = new Map();
  for (const t of man.tracks ?? []) map.set(t.file, t.title);
  map.set("shell-theme.mp3", "Dispatch in Miami");
  map.set("shell-theme.wav", "Dispatch in Miami");
  return map;
}

function retag(path, title) {
  const ext = extname(path);
  const tmp = join(
    dirname(path),
    `._retag_${randomBytes(6).toString("hex")}${ext}`
  );
  execFileSync(
    ffmpeg,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      path,
      "-map_metadata",
      "-1",
      "-metadata",
      `title=${title}`,
      "-metadata",
      `artist=${ARTIST}`,
      "-metadata",
      `album_artist=${ARTIST}`,
      "-metadata",
      `album=${ALBUM}`,
      "-metadata",
      `composer=${ARTIST}`,
      "-metadata",
      `publisher=${PUBLISHER}`,
      "-metadata",
      `copyright=${COPYRIGHT}`,
      "-metadata",
      `comment=${COMMENT}`,
      "-metadata",
      "genre=Soundtrack",
      "-metadata",
      "date=2026",
      "-metadata",
      `encoded_by=${PUBLISHER}`,
      "-c",
      "copy",
      tmp,
    ],
    { stdio: "inherit" }
  );
  copyFileSync(tmp, path);
  rmSync(tmp, { force: true });
}

function hasSuno(path) {
  const buf = readFileSync(path);
  const head = buf
    .subarray(0, Math.min(buf.length, 1_000_000))
    .toString("latin1");
  const tail = buf.subarray(Math.max(0, buf.length - 256)).toString("latin1");
  return /suno/i.test(head + tail);
}

function probeTags(path) {
  const out = execFileSync(
    ffprobe,
    ["-v", "quiet", "-print_format", "json", "-show_format", path],
    { encoding: "utf8" }
  );
  return JSON.parse(out)?.format?.tags ?? {};
}

function buildZip(zipPath, entries) {
  const stage = join(tmpdir(), `s305ost_${randomBytes(4).toString("hex")}`);
  mkdirSync(stage, { recursive: true });
  try {
    for (const e of entries) {
      copyFileSync(e.src, join(stage, e.name));
    }
    mkdirSync(dirname(zipPath), { recursive: true });
    rmSync(zipPath, { force: true });
    if (process.platform === "win32") {
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `Compress-Archive -Path '${stage}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal -Force`,
        ],
        { stdio: "inherit" }
      );
    } else {
      execFileSync("zip", ["-j", "-r", zipPath, "."], {
        cwd: stage,
        stdio: "inherit",
      });
    }
    console.log(`zip ${zipPath} (${statSync(zipPath).size} bytes)`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

const titles = loadTitles();
const publicAudio = join(root, "packages/web/public/audio");
const scenarios = join(publicAudio, "scenarios");
const files = [
  join(publicAudio, "shell-theme.mp3"),
  join(publicAudio, "shell-theme.wav"),
  ...readdirSync(scenarios)
    .filter((f) => f.endsWith(".mp3"))
    .map((f) => join(scenarios, f)),
].filter((p) => existsSync(p));

let ok = 0;
for (const path of files) {
  const name = basename(path);
  const title =
    titles.get(name) || name.replace(/\.[^.]+$/, "").replace(/-/g, " ");
  process.stdout.write(`retag ${name} → ${title}… `);
  retag(path, title);
  if (hasSuno(path)) {
    console.log("FAIL still has suno");
    process.exit(1);
  }
  const tags = probeTags(path);
  if ((tags.artist || "") !== ARTIST) {
    console.log(`FAIL artist=${tags.artist}`);
    process.exit(1);
  }
  console.log("ok");
  ok += 1;
}

const distAudio = join(root, "packages/web/dist/audio");
if (existsSync(distAudio)) {
  for (const path of files) {
    const rel = path.slice(publicAudio.length).replace(/^[\\/]/, "");
    const dest = join(distAudio, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(path, dest);
  }
  console.log("mirrored → packages/web/dist/audio");
}

if (wantZip) {
  const sc = scenarios;
  const pub = publicAudio;
  const ost = join(root, "exports/ost");
  const pair = (file, name) => ({
    src: file === "shell-theme.mp3" ? join(pub, file) : join(sc, file),
    name,
  });
  const t16 = [
    pair("shell-theme.mp3", "01-Dispatch-in-Miami.mp3"),
    pair("collins-alert.mp3", "02-Collins-Alert.mp3"),
    pair("south-beach-pursuit.mp3", "03-South-Beach-Pursuit.mp3"),
    pair("south-beach-alarm.mp3", "04-South-Beach-Alarm.mp3"),
    pair("mister-three-oh-five.mp3", "05-Mister-Three-Oh-Five.mp3"),
    pair("miami-cipher.mp3", "06-Miami-Cipher.mp3"),
    pair("vice-grid.mp3", "07-Vice-Grid.mp3"),
    pair("chopper-run.mp3", "08-Chopper-Run.mp3"),
    pair("gloria-bay.mp3", "09-Gloria-Bay.mp3"),
    pair("calle-ocho-alarm.mp3", "10-Calle-Ocho-Alarm.mp3"),
    pair("mayday-over-miami.mp3", "11-Mayday-Over-Miami.mp3"),
    pair("biscayne-bay-run.mp3", "12-Biscayne-Bay-Run.mp3"),
    pair("biscayne-bay-alert.mp3", "13-Biscayne-Bay-Alert.mp3"),
    pair("miami-command-grid.mp3", "14-Miami-Command-Grid.mp3"),
    pair("miami-fog-command.mp3", "15-Miami-Fog-Command.mp3"),
    pair("miami-grid.mp3", "16-Miami-Grid.mp3"),
  ];
  const t17 = [
    ...t16,
    { src: join(sc, "miami-grid-1.mp3"), name: "17-Miami-Grid-I.mp3" },
  ];
  const t18 = [
    ...t17,
    { src: join(sc, "miami-grid-2.mp3"), name: "18-Miami-Grid-II.mp3" },
  ];
  buildZip(join(ost, "SECTOR-305-OST-16-tracks.zip"), t16);
  buildZip(join(ost, "SECTOR-305-OST-17-tracks.zip"), t17);
  buildZip(join(ost, "SECTOR-305-OST-18-tracks.zip"), t18);
}

// Write a short proof artifact under docs/ost (tracked)
const proof = {
  scrubbedAt: new Date().toISOString(),
  artist: ARTIST,
  publisher: PUBLISHER,
  album: ALBUM,
  copyright: COPYRIGHT,
  mastersRetagged: ok,
  sunoResidual: false,
  method: "ffmpeg -map_metadata -1 + rewrite tags stream-copy",
};
const proofPath = join(root, "docs/ost/METADATA_OWNERSHIP.json");
writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n", "utf8");

console.log(`
Done. Retagged ${ok} masters.
  artist:    ${ARTIST}
  publisher: ${PUBLISHER}
  album:     ${ALBUM}
  suno:      scrubbed
  proof:     ${proofPath}
`);
