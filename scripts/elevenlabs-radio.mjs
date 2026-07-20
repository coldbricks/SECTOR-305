#!/usr/bin/env node
/**
 * Bake SECTOR 305 radio voice lines via ElevenLabs TTS.
 *
 * Secrets: read ELEVENLABS_API_KEY from environment only (never argv / never commit).
 *
 * Usage:
 *   $env:ELEVENLABS_API_KEY = "…"   # PowerShell — you type this, not the agent
 *   npm run radio:tts
 *   npm run radio:tts -- --force    # regenerate even if file exists
 *   npm run radio:tts -- --dry-run  # estimate characters, no API calls
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "packages/web/public/audio/radio-voice");
const linesPath = join(outDir, "lines.json");
const manifestPath = join(outDir, "manifest.json");

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry-run");

/** Lower = bake first (so kills leave the most useful air first). */
function bakePriority(line) {
  const id = String(line.id ?? "");
  const kind = String(line.kind ?? "");
  if (kind === "TRAINER") return 0;
  if (kind === "CALLER") return 1;
  if (kind === "EMERGENCY") return 2;
  if (kind === "DISPATCH") return 3;
  if (kind === "BOLO") return 4;
  if (kind === "UPDATE") return 5;
  if (/responding/i.test(id) || /responding/i.test(line.plainText || line.text || ""))
    return 6;
  if (kind === "ACK") return 7;
  if (kind === "QUERY") return 8;
  if (kind === "SYSTEM") return 9;
  if (kind === "STATUS") return 10;
  return 11;
}

function normalizeCaption(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadLines() {
  if (!existsSync(linesPath)) {
    throw new Error(`Missing lines catalog: ${linesPath}`);
  }
  return JSON.parse(readFileSync(linesPath, "utf8"));
}

function writePlayableManifest(catalog, clips, { generated, skipped, dryRun, charTotal, partial }) {
  // Clips visited this run that exist on disk
  const fromRun = clips.filter(
    (c) => c.status === "generated" || c.status === "regenerated" || c.status === "cached"
  );
  let playable = fromRun;

  // Dry-run: never wipe the live library
  // Partial checkpoint: merge prior playable so unvisited ids stay live
  if ((dryRun || partial) && existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (Array.isArray(prev.clips) && prev.clips.length) {
        if (dryRun) {
          playable = prev.clips;
        } else {
          const byId = new Map(prev.clips.map((c) => [c.id, c]));
          for (const c of fromRun) byId.set(c.id, c);
          playable = [...byId.values()];
        }
      }
    } catch {
      /* keep fromRun */
    }
  }

  const manifest = {
    schema: "s305.radio_voice_manifest.v1",
    generatedAt: dryRun ? undefined : new Date().toISOString(),
    model_id: catalog.model_id,
    characterEstimate: charTotal,
    clipCount: playable.length,
    generated,
    skipped,
    dryRun,
    clips: playable,
    planned: dryRun
      ? {
          lineCount: clips.length,
          characterEstimate: charTotal,
          newOrChanged: clips.filter((c) => c.status !== "cached").length,
        }
      : undefined,
  };
  if (!dryRun) manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return playable.length;
}

async function tts({ apiKey, voiceId, text, modelId, outputFormat, settings }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`;
  // v3: audio tags like [calm] [dispatch] live in `text`. Keep voice_settings light.
  const body = {
    text,
    model_id: modelId,
  };
  // eleven_v3 is picky — only attach classic settings for non-v3 models
  if (!String(modelId).includes("v3")) {
    body.voice_settings = {
      stability: settings?.stability ?? 0.45,
      similarity_boost: settings?.similarity_boost ?? 0.75,
      style: settings?.style ?? 0.15,
      use_speaker_boost: settings?.use_speaker_boost ?? true,
    };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${errBody.slice(0, 500)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const catalog = loadLines();
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || "";
  if (!dryRun && !apiKey) {
    console.error(`
ELEVENLABS_API_KEY is not set.

  PowerShell (this session only):
    $env:ELEVENLABS_API_KEY = "<your key>"
    npm run radio:tts

  Never commit the key. Never paste it into git or chat if you can avoid it.
`);
    process.exit(2);
  }

  mkdirSync(outDir, { recursive: true });

  const clips = [];
  let charTotal = 0;
  let generated = 0;
  let skipped = 0;

  // Priority order: coach/caller/dispatch/responding before bulk STATUS matrix
  const ordered = [...catalog.lines].sort((a, b) => {
    const d = bakePriority(a) - bakePriority(b);
    if (d !== 0) return d;
    return String(a.id).localeCompare(String(b.id));
  });

  const { statSync } = await import("node:fs");
  const FLUSH_EVERY = 12;

  for (const line of ordered) {
    const voice = catalog.voices[line.voice];
    if (!voice) throw new Error(`Unknown voice key: ${line.voice}`);
    const voiceId =
      process.env[voice.voice_id_env] || voice.default_voice_id;
    const file = `${line.id}.mp3`;
    const abs = join(outDir, file);
    const text = line.text; // may include v3 tags [calm] [dispatch]
    const plain = line.plainText || text.replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
    charTotal += text.length;

    const matchKeys = [
      ...new Set(
        [plain, ...(line.match ?? [])]
          .map(normalizeCaption)
          .filter(Boolean)
          // never match on bracket tags
          .filter((m) => !m.includes("calm") || m.length > 20)
      ),
    ];

    const modelId = catalog.model_id || "eleven_v3";
    // Re-bake when spoken text, model, OR voice changes
    const textFingerprint = createHash("sha256")
      .update(`${modelId}\n${voiceId}\n${text}`)
      .digest("hex")
      .slice(0, 16);
    const metaPath = join(outDir, `${line.id}.meta.json`);
    let priorTextFp = null;
    if (existsSync(metaPath)) {
      try {
        priorTextFp = JSON.parse(readFileSync(metaPath, "utf8")).textFp ?? null;
      } catch {
        priorTextFp = null;
      }
    }
    // No meta → treat as stale (old turbo bake without tags)
    const textChanged = priorTextFp !== textFingerprint;

    if (!force && existsSync(abs) && priorTextFp != null && !textChanged) {
      skipped += 1;
      clips.push({
        id: line.id,
        file: `/audio/radio-voice/${file}`,
        voice: line.voice,
        voiceId,
        kind: line.kind,
        text,
        plainText: plain,
        match: matchKeys,
        scenarioIds: line.scenarioIds ?? ["*"],
        channel: line.channel,
        bytes: statSync(abs).size,
        status: "cached",
        textFp: textFingerprint,
      });
      continue;
    }

    if (dryRun) {
      clips.push({
        id: line.id,
        file: `/audio/radio-voice/${file}`,
        voice: line.voice,
        voiceId,
        kind: line.kind,
        text,
        plainText: plain,
        match: matchKeys,
        scenarioIds: line.scenarioIds ?? ["*"],
        channel: line.channel,
        status: "dry-run",
      });
      continue;
    }

    process.stdout.write(`TTS ${line.id} (${text.length} chars)… `);
    const buf = await tts({
      apiKey,
      voiceId,
      text,
      modelId: catalog.model_id || "eleven_v3",
      outputFormat: catalog.output_format || "mp3_44100_128",
      settings: voice.settings,
    });
    writeFileSync(abs, buf);
    writeFileSync(
      metaPath,
      JSON.stringify(
        { id: line.id, textFp: textFingerprint, text, voiceId, updatedAt: new Date().toISOString() },
        null,
        2
      ) + "\n",
      "utf8"
    );
    generated += 1;
    console.log(`${buf.length} bytes${textChanged ? " (text changed)" : ""}`);
    clips.push({
      id: line.id,
      file: `/audio/radio-voice/${file}`,
      voice: line.voice,
      voiceId,
      kind: line.kind,
      text,
      plainText: plain,
      match: matchKeys,
      scenarioIds: line.scenarioIds ?? ["*"],
      channel: line.channel,
      bytes: buf.length,
      status: textChanged ? "regenerated" : "generated",
      sha256: createHash("sha256").update(buf).digest("hex").slice(0, 16),
      textFp: textFingerprint,
    });

    // Crash-safe: flush playable manifest every N new clips (merge prior)
    if (generated % FLUSH_EVERY === 0) {
      const n = writePlayableManifest(catalog, clips, {
        generated,
        skipped,
        dryRun: false,
        charTotal,
        partial: true,
      });
      console.log(`  ↳ checkpoint manifest ${n} playable`);
    }

    // polite pacing
    await new Promise((r) => setTimeout(r, 100));
  }

  const playableCount = writePlayableManifest(catalog, clips, {
    generated,
    skipped,
    dryRun,
    charTotal,
    partial: false,
  });
  if (dryRun) {
    console.log(
      `(dry-run) playable preserved/estimated · catalog ${catalog.lines.length} · newOrChanged ${
        clips.filter((c) => c.status !== "cached").length
      } · cached ${skipped}`
    );
  }

  console.log(`
Radio voice bake complete
  lines:      ${catalog.lines.length}
  characters: ${charTotal} (estimate; credits depend on your ElevenLabs plan)
  generated:  ${generated}
  cached:     ${skipped}
  playable:   ${playableCount}
  dry-run:    ${dryRun}
  order:      priority (trainer→caller→dispatch→responding→ack→status)
  manifest:   ${manifestPath}
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
