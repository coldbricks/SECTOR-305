#!/usr/bin/env node
/**
 * SECTOR 305 scenario pack CLI — folder ↔ .305 single file.
 *
 *   node scripts/scenario-305.mjs list
 *   node scripts/scenario-305.mjs validate <folder|.305>
 *   node scripts/scenario-305.mjs pack <folder> [--out path]
 *   node scripts/scenario-305.mjs unpack <file.305> [--force]
 *
 * See docs/SCENARIO_PACK_305.md
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const SCENARIOS = join(REPO, "scenarios");
const EXPORTS = join(REPO, "exports", "scenarios");
const SCHEMA_ID = "s305.scenario_pack.v1";

function usage() {
  console.log(`Usage:
  npm run scenario:list
  npm run scenario:validate -- <folder|.305>
  npm run scenario:pack -- <folder> [--out path]
  npm run scenario:unpack -- <file.305> [--force]
`);
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function listScenarioFolders() {
  if (!existsSync(SCENARIOS)) return [];
  return readdirSync(SCENARIOS)
    .map((n) => join(SCENARIOS, n))
    .filter((p) => isDir(p) && existsSync(join(p, "scenario.json")))
    .map((p) => basename(p))
    .sort();
}

function loadFolder(folder) {
  const dir = resolve(folder);
  const scenarioPath = join(dir, "scenario.json");
  if (!existsSync(scenarioPath)) {
    throw new Error(`scenario.json missing in ${dir}`);
  }
  const scenario = readJson(scenarioPath);
  const notesPath = join(dir, "EXPECTED.md");
  const notes = existsSync(notesPath)
    ? readFileSync(notesPath, "utf8")
    : undefined;
  const goldens = {};
  const passPath = join(dir, "session_pass.json");
  const failPath = join(dir, "session_fail.json");
  if (existsSync(passPath)) goldens.pass = readJson(passPath);
  if (existsSync(failPath)) goldens.fail = readJson(failPath);

  const manifest = {
    id: scenario.id,
    version: scenario.version ?? "0.0.0",
    kind: scenario.kind,
    packId: scenario.packId,
    seed: scenario.seed,
    title: scenario.title ?? scenario.id,
    description: scenario.description,
    adversarialTags: scenario.adversarialTags ?? [],
    contentNotes: scenario.contentNotes ?? [],
    durationMs: scenario.durationMs,
  };

  /** @type {Record<string, unknown>} */
  const pack = {
    schema: SCHEMA_ID,
    format: "305",
    packedAt: new Date().toISOString(),
    manifest,
    scenario,
    assets: {},
  };
  if (notes != null) pack.notes = notes;
  if (Object.keys(goldens).length) pack.goldens = goldens;
  return pack;
}

function validatePack(pack, label = "pack") {
  const errors = [];
  if (pack.schema !== SCHEMA_ID) {
    errors.push(`${label}: schema must be ${SCHEMA_ID}`);
  }
  if (pack.format !== "305") {
    errors.push(`${label}: format must be "305"`);
  }
  const m = pack.manifest;
  if (!m || typeof m !== "object") {
    errors.push(`${label}: missing manifest`);
  } else {
    for (const k of ["id", "version", "kind", "packId", "title"]) {
      if (typeof m[k] !== "string" || !m[k]) {
        errors.push(`${label}: manifest.${k} required string`);
      }
    }
    if (typeof m.seed !== "number" || !Number.isInteger(m.seed)) {
      errors.push(`${label}: manifest.seed required integer`);
    }
  }
  const s = pack.scenario;
  if (!s || typeof s !== "object") {
    errors.push(`${label}: missing scenario`);
  } else {
    if (typeof s.id !== "string") errors.push(`${label}: scenario.id required`);
    if (m && s.id !== m.id) {
      errors.push(`${label}: manifest.id !== scenario.id`);
    }
    if (m && typeof s.packId === "string" && s.packId !== m.packId) {
      errors.push(`${label}: manifest.packId !== scenario.packId`);
    }
  }
  return errors;
}

function cmdList() {
  const ids = listScenarioFolders();
  console.log(`Authoring folders under scenarios/ (${ids.length}):`);
  for (const id of ids) {
    const raw = readJson(join(SCENARIOS, id, "scenario.json"));
    console.log(`  ${id}  ·  ${raw.kind ?? "?"}  ·  ${raw.title ?? ""}`);
  }
}

function cmdValidate(target) {
  if (!target) {
    usage();
    process.exit(2);
  }
  const p = resolve(target);
  let pack;
  if (p.endsWith(".305") && existsSync(p) && !isDir(p)) {
    pack = readJson(p);
  } else if (isDir(p)) {
    pack = loadFolder(p);
  } else {
    console.error(`Not a folder or .305 file: ${p}`);
    process.exit(1);
  }
  const errors = validatePack(pack, p);
  if (errors.length) {
    console.error("INVALID");
    for (const e of errors) console.error(`  · ${e}`);
    process.exit(1);
  }
  console.log(`OK  ${pack.manifest.id}  v${pack.manifest.version}  (${pack.manifest.kind})`);
}

function cmdPack(folder, outArg) {
  if (!folder) {
    usage();
    process.exit(2);
  }
  const pack = loadFolder(folder);
  const errors = validatePack(pack, folder);
  if (errors.length) {
    console.error("Cannot pack — validation failed:");
    for (const e of errors) console.error(`  · ${e}`);
    process.exit(1);
  }
  mkdirSync(EXPORTS, { recursive: true });
  const out =
    outArg ??
    join(EXPORTS, `${pack.manifest.id}.305`);
  writeFileSync(out, JSON.stringify(pack, null, 2) + "\n", "utf8");
  console.log(`Packed → ${out}`);
}

function cmdUnpack(file, force) {
  if (!file) {
    usage();
    process.exit(2);
  }
  const p = resolve(file);
  if (!existsSync(p)) {
    console.error(`Missing: ${p}`);
    process.exit(1);
  }
  const pack = readJson(p);
  const errors = validatePack(pack, p);
  if (errors.length) {
    console.error("INVALID pack");
    for (const e of errors) console.error(`  · ${e}`);
    process.exit(1);
  }
  const id = pack.manifest.id;
  const dest = join(SCENARIOS, id);
  if (existsSync(dest) && !force) {
    console.error(`Refusing to overwrite ${dest} (pass --force)`);
    process.exit(1);
  }
  mkdirSync(dest, { recursive: true });
  writeFileSync(
    join(dest, "scenario.json"),
    JSON.stringify(pack.scenario, null, 2) + "\n",
    "utf8"
  );
  if (typeof pack.notes === "string" && pack.notes.length) {
    writeFileSync(join(dest, "EXPECTED.md"), pack.notes, "utf8");
  }
  if (pack.goldens?.pass) {
    writeFileSync(
      join(dest, "session_pass.json"),
      JSON.stringify(pack.goldens.pass, null, 2) + "\n",
      "utf8"
    );
  }
  if (pack.goldens?.fail) {
    writeFileSync(
      join(dest, "session_fail.json"),
      JSON.stringify(pack.goldens.fail, null, 2) + "\n",
      "utf8"
    );
  }
  console.log(`Unpacked → ${dest}`);
}

const args = process.argv.slice(2);
const cmd = args[0];
const force = args.includes("--force");
const outIdx = args.indexOf("--out");
const outArg = outIdx >= 0 ? args[outIdx + 1] : undefined;
const positional = args.filter(
  (a, i) => a !== "--force" && a !== "--out" && i !== outIdx + 1 && a !== cmd
);

try {
  switch (cmd) {
    case "list":
      cmdList();
      break;
    case "validate":
      cmdValidate(positional[0]);
      break;
    case "pack":
      cmdPack(positional[0], outArg);
      break;
    case "unpack":
      cmdUnpack(positional[0], force);
      break;
    default:
      usage();
      process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
