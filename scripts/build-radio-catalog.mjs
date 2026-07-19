#!/usr/bin/env node
/**
 * Expand radio lexicon + speech_rules samples → lines.json
 *
 * Pipeline:
 *   1. Author samples/patterns in speech_rules.json (time checks, BIS, phonetics)
 *   2. Author content in lexicon.json (units, dispatch recipes, callers, streets)
 *   3. This script BUILDS the full matrix
 *   4. npm run radio:tts bakes only missing / changed clips
 *
 *   npm run radio:catalog           # default time subset
 *   npm run radio:catalog -- --full # all time samples (bigger bake)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  expandFromSamples,
  speakCallsign,
  speakTimeHhmm,
  demoSample,
} from "./radio-speech-engine.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "../packages/web/public/audio/radio-voice");
const lexiconPath = join(dir, "lexicon.json");
const rulesPath = join(dir, "speech_rules.json");
const linesPath = join(dir, "lines.json");

const full = process.argv.includes("--full");

function loadJson(path) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function unitByCs(lex, letters, cs) {
  const u = lex.units.find((x) => x.callsign === cs);
  if (!u) return undefined;
  return {
    ...u,
    spoken: speakCallsign(cs, letters),
  };
}

function pri(lex, code) {
  return lex.priorities.find((p) => p.code === code);
}
function nature(lex, code) {
  return lex.natures.find((n) => n.code === code);
}
function loc(lex, id) {
  return lex.locations.find((l) => l.id === id);
}
function safety(lex, ids) {
  return (ids ?? [])
    .map((id) => lex.safety_tags.find((s) => s.id === id))
    .filter(Boolean);
}

function captionDispatch(units, pCode, natureLabel, locMatch0, safetySpoken) {
  const parts = [units.join(", "), pCode, natureLabel, locMatch0];
  if (safetySpoken.length) parts.push(safetySpoken.join(", "));
  return parts.join(", ");
}

/** Content-specific lines: recipes, channel, natures, callers (not the sample matrix). */
function buildContentLines(lex, letters) {
  const lines = [];
  const seen = new Set();
  const push = (line) => {
    if (seen.has(line.id)) return;
    seen.add(line.id);
    lines.push(line);
  };

  for (const p of lex.channel_phrases ?? []) {
    push({
      id: `chan_${p.id}`,
      voice: p.voice || "dispatch",
      text: p.spoken,
      match: p.match,
      kind: p.kind || "SYSTEM",
      scenarioIds: ["*"],
    });
  }

  for (const r of lex.dispatch_recipes ?? []) {
    const unitObjs = r.units
      .map((cs) => unitByCs(lex, letters, cs))
      .filter(Boolean);
    if (!unitObjs.length) continue;
    const p = pri(lex, r.priority);
    const n = nature(lex, r.nature);
    const l = loc(lex, r.location);
    if (!p || !n || !l) continue;
    const saf = safety(lex, r.safety);
    const spokenUnits = unitObjs.map((u) => u.spoken).join(", ");
    const captionUnits = unitObjs.map((u) => u.callsign).join(", ");
    const safetySpoken = saf.map((s) => s.spoken);

    const spoken =
      [spokenUnits, p.spoken, n.spoken, l.spoken, ...safetySpoken]
        .filter(Boolean)
        .join(", ") + ".";

    const caption = captionDispatch(
      unitObjs.map((u) => u.callsign),
      p.code,
      n.match[0] || n.spoken,
      l.match[0],
      safetySpoken
    );
    const captionShort = [
      captionUnits,
      p.code,
      n.spoken,
      l.match[0],
      ...safetySpoken,
    ]
      .filter(Boolean)
      .join(", ");

    const matches = new Set([
      caption,
      captionShort,
      `${captionUnits}, ${p.code} ${n.spoken}, ${l.match[0]}${
        safetySpoken.length ? ", " + safetySpoken.join(", ") : ""
      }`,
    ]);
    if (r.id === "ocean_p1_robbery") {
      matches.add(
        "3A12, 3A14, P1 robbery in progress, 1400 block Ocean Drive, weapon reported"
      );
    }
    if (r.id === "ocean_p3_disturbance_vague") {
      matches.add("3A12, P3 disturbance, beach area");
    }

    push({
      id: `disp_${r.id}`,
      voice: "dispatch",
      text: spoken,
      match: [...matches],
      kind: "DISPATCH",
      scenarioIds: r.scenarioIds ?? ["*"],
      meta: { recipe: r.id },
    });
    if (r.priority === "P0" || r.priority === "P1") {
      push({
        id: `disp_b_${r.id}`,
        voice: "dispatch_b",
        text: spoken,
        match: [`alt ${caption}`, captionShort],
        kind: "DISPATCH",
        scenarioIds: r.scenarioIds ?? ["*"],
      });
    }
  }

  for (const l of (lex.locations ?? []).slice(0, 10)) {
    push({
      id: `bolo_${l.id}`,
      voice: "dispatch",
      text: `Be on the lookout, last seen ${l.spoken}.`,
      match: [`BOLO ${l.match[0]}`, `last seen ${l.match[0]}`, l.match[0]],
      kind: "BOLO",
      scenarioIds: ["*"],
    });
  }

  for (const n of lex.natures ?? []) {
    push({
      id: `nature_${n.code.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      voice: "dispatch",
      text: `Nature is ${n.spoken}.`,
      match: n.match,
      kind: "UPDATE",
      scenarioIds: ["*"],
    });
  }

  for (const c of lex.caller_lines ?? []) {
    const tagPrefix = (c.tags ?? ["frantic"])
      .map((t) => `[${String(t).replace(/[\[\]]/g, "")}]`)
      .join(" ");
    push({
      id: c.id,
      voice: c.voice,
      text: `${tagPrefix} ${c.spoken}`.trim(),
      match: c.match ?? [c.spoken],
      kind: "CALLER",
      channel: "phone",
      scenarioIds: c.scenarioIds ?? ["*"],
      contentNotes: c.contentNotes,
      meta: { tags: c.tags ?? [] },
    });
  }

  // Academy trainer (Dave) — coach HUD / walkthrough
  for (const t of lex.trainer_lines ?? []) {
    const tagPrefix = (t.tags ?? ["calm", "friendly"])
      .map((x) => `[${String(x).replace(/[\[\]]/g, "")}]`)
      .join(" ");
    push({
      id: t.id,
      voice: t.voice || "trainer",
      text: `${tagPrefix} ${t.spoken}`.trim(),
      match: t.match ?? [t.spoken],
      kind: "TRAINER",
      channel: "trainer",
      scenarioIds: t.scenarioIds ?? ["*"],
      meta: { tags: t.tags ?? [] },
    });
  }

  return lines;
}

function withDeliveryTags(line) {
  if (
    line.kind === "CALLER" ||
    line.channel === "phone" ||
    line.kind === "TRAINER" ||
    line.channel === "trainer"
  ) {
    const plainText = line.text
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { ...line, plainText };
  }
  const body = line.text.replace(/^\s*\[[^\]]+\]\s*/g, "").trim();
  const isDispatch =
    line.voice === "dispatch" ||
    line.voice === "dispatch_b" ||
    line.kind === "DISPATCH" ||
    line.kind === "QUERY" ||
    line.kind === "BOLO" ||
    line.kind === "EMERGENCY" ||
    line.kind === "UPDATE" ||
    line.kind === "SYSTEM";
  // Numeric atoms stay bare (or calm dispatch)
  const prefix = isDispatch ? "[calm] [dispatch] " : "[calm] ";
  return { ...line, text: prefix + body, plainText: body };
}

// ---------------------------------------------------------------------------
const lex = loadJson(lexiconPath);
const rules = loadJson(rulesPath);
const letters =
  rules.phonetic?.LAPD ?? lex.phonetic_alphabet?.letters ?? {};

const { lines: sampleLines, stats: sampleStats } = expandFromSamples(
  rules,
  lex,
  { full }
);
const contentLines = buildContentLines(lex, letters);

// Sample matrix first, then content (content ids win if collide)
const byId = new Map();
for (const l of sampleLines) byId.set(l.id, l);
for (const l of contentLines) byId.set(l.id, l);
const lines = [...byId.values()];

const unitSpokenMap = Object.fromEntries(
  (lex.units ?? []).map((u) => [u.callsign, speakCallsign(u.callsign, letters)])
);
const unitSpokenNato = Object.fromEntries(
  (lex.units ?? []).map((u) => [
    u.callsign,
    speakCallsign(u.callsign, rules.phonetic?.NATO ?? {}),
  ])
);

const taggedLines = lines.map(withDeliveryTags);

const catalog = {
  schema: "s305.radio_voice_lines.v1",
  notes:
    "SAMPLE-DRIVEN. Edit speech_rules.json patterns + lexicon content; run radio:catalog. Do not hand-edit lines.json at scale.",
  model_id: "eleven_v3",
  output_format: "mp3_44100_128",
  phonetic: {
    default: "LAPD",
    LAPD: rules.phonetic?.LAPD,
    NATO: rules.phonetic?.NATO,
  },
  unitSpoken: unitSpokenMap,
  unitSpokenNato,
  timeExamples: Object.fromEntries(
    (rules.numerics?.time_samples ?? []).slice(0, 6).map((t) => [
      t,
      speakTimeHhmm(t),
    ])
  ),
  demo: demoSample(),
  delivery: {
    dispatch: "[calm] [dispatch]",
    field: "[calm]",
    caller: "[frantic] / …",
  },
  voices: lex.voices,
  lines: taggedLines,
  stats: {
    lineCount: taggedLines.length,
    charEstimate: taggedLines.reduce((a, l) => a + l.text.length, 0),
    sampleMatrix: sampleStats,
    contentLines: contentLines.length,
    full,
    voiceCount: Object.keys(lex.voices || {}).length,
    model_id: "eleven_v3",
  },
};

writeFileSync(linesPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");

console.log(`Wrote ${linesPath}`);
console.log(
  `  lines=${catalog.stats.lineCount} chars≈${catalog.stats.charEstimate} full=${full}`
);
console.log(
  `  sample-matrix: ${sampleStats.lineCount} lines / ${sampleStats.charEstimate} chars (times×${sampleStats.timesUsed})`
);
console.log(`  content (recipes/callers/…): ${contentLines.length}`);
console.log(`  demo LAPD 3A12: ${catalog.demo.example_lapd}`);
console.log(`  demo NATO 3A12: ${catalog.demo.example_nato}`);
console.log(`  demo time 2121: ${catalog.demo.example_time}`);
console.log(`  demo BIS line: ${catalog.demo.example_line}`);
const bis = taggedLines.find((l) => l.id.includes("back_in_service") && l.id.includes("2121"));
if (bis) console.log(`  live BIS: ${bis.text}`);
