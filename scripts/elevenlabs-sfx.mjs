#!/usr/bin/env node
/**
 * Bake channel SFX via ElevenLabs Sound Generation API.
 * Uses same ELEVENLABS_API_KEY as TTS (never commit).
 *
 *   npm run radio:sfx
 *   npm run radio:sfx -- --force
 *   npm run radio:sfx -- --dry-run
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const catalogPath = join(
  root,
  "packages/web/public/audio/channel-sfx/catalog.json"
);
const outDir = join(root, "packages/web/public/audio/channel-sfx");
const manifestPath = join(outDir, "manifest.json");

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry-run");

async function generateSfx({ apiKey, text, durationSeconds }) {
  const url =
    "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
  const body = {
    text,
    prompt_influence: 0.35,
  };
  if (typeof durationSeconds === "number" && durationSeconds > 0) {
    body.duration_seconds = Math.min(22, Math.max(0.5, durationSeconds));
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
    const err = await res.text().catch(() => "");
    throw new Error(`SFX ${res.status}: ${err.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || "";
  if (!dryRun && !apiKey) {
    console.error("ELEVENLABS_API_KEY not set.");
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });

  const clips = [];
  let generated = 0;
  let skipped = 0;

  for (const fx of catalog.effects) {
    const abs = join(outDir, fx.file);
    const promptFp = createHash("sha256")
      .update(fx.prompt + "|" + (fx.duration_seconds ?? ""))
      .digest("hex")
      .slice(0, 16);
    const metaPath = join(outDir, `${fx.id}.meta.json`);

    let prior = null;
    if (existsSync(metaPath)) {
      try {
        prior = JSON.parse(readFileSync(metaPath, "utf8")).promptFp;
      } catch {
        prior = null;
      }
    }
    const changed = prior != null && prior !== promptFp;

    if (!force && existsSync(abs) && prior === promptFp) {
      skipped += 1;
      clips.push({
        id: fx.id,
        file: `/audio/channel-sfx/${fx.file}`,
        status: "cached",
        promptFp,
      });
      continue;
    }

    if (dryRun) {
      clips.push({
        id: fx.id,
        file: `/audio/channel-sfx/${fx.file}`,
        status: changed ? "would-regen" : "would-generate",
        prompt: fx.prompt,
        duration_seconds: fx.duration_seconds,
      });
      continue;
    }

    process.stdout.write(`SFX ${fx.id}… `);
    const buf = await generateSfx({
      apiKey,
      text: fx.prompt,
      durationSeconds: fx.duration_seconds,
    });
    writeFileSync(abs, buf);
    writeFileSync(
      metaPath,
      JSON.stringify(
        {
          id: fx.id,
          promptFp,
          prompt: fx.prompt,
          duration_seconds: fx.duration_seconds,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ) + "\n"
    );
    generated += 1;
    console.log(`${buf.length} bytes`);
    clips.push({
      id: fx.id,
      file: `/audio/channel-sfx/${fx.file}`,
      status: "generated",
      bytes: buf.length,
      promptFp,
    });
    await new Promise((r) => setTimeout(r, 200));
  }

  const playable = dryRun
    ? existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8")).clips ?? []
      : []
    : clips.filter((c) => c.status === "generated" || c.status === "cached");

  // On real bake, include all that exist on disk
  const manifestClips = dryRun
    ? playable
    : catalog.effects
        .map((fx) => {
          const hit = clips.find((c) => c.id === fx.id);
          if (!hit || (hit.status !== "generated" && hit.status !== "cached")) {
            if (existsSync(join(outDir, fx.file))) {
              return {
                id: fx.id,
                file: `/audio/channel-sfx/${fx.file}`,
                status: "cached",
              };
            }
            return null;
          }
          return {
            id: fx.id,
            file: `/audio/channel-sfx/${fx.file}`,
            status: hit.status,
          };
        })
        .filter(Boolean);

  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schema: "s305.channel_sfx_manifest.v1",
        generatedAt: dryRun ? null : new Date().toISOString(),
        clipCount: manifestClips.length,
        generated,
        skipped,
        dryRun,
        clips: manifestClips,
        planned: dryRun ? clips : undefined,
      },
      null,
      2
    ) + "\n"
  );

  console.log(`
Channel SFX bake
  effects:   ${catalog.effects.length}
  generated: ${generated}
  cached:    ${skipped}
  dry-run:   ${dryRun}
  manifest:  ${manifestPath}
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
