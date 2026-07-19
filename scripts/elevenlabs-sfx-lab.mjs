#!/usr/bin/env node
/**
 * SFX prompt lab — generate variants, score with ffmpeg volumedetect, promote winners.
 *
 *   npm run radio:sfx:lab
 *   npm run radio:sfx:lab -- --only=radio_key_up,phone_line_bed
 *
 * Requires ELEVENLABS_API_KEY. Uses ffmpeg/ffprobe if on PATH.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sfxDir = join(root, "packages/web/public/audio/channel-sfx");
const catalogPath = join(sfxDir, "catalog.json");
const variantsDir = join(sfxDir, "variants");
const labReportPath = join(sfxDir, "LAB_REPORT.md");
const manifestPath = join(sfxDir, "manifest.json");

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()))
  : null;
const dryRun = args.includes("--dry-run");

function run(cmd, argv) {
  const r = spawnSync(cmd, argv, { encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout || "") + (r.stderr || ""), status: r.status };
}

function hasBin(name) {
  const r = spawnSync(name, ["-version"], { encoding: "utf8" });
  return r.status === 0 || (r.stderr || "").includes("ffmpeg") || (r.stdout || "").includes("ffmpeg");
}

const HAS_FFMPEG = hasBin("ffmpeg");
const HAS_FFPROBE = hasBin("ffprobe");

function probeDuration(file) {
  if (!HAS_FFPROBE) return null;
  const r = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const n = parseFloat((r.out || "").trim());
  return Number.isFinite(n) ? n : null;
}

function probeVolume(file) {
  if (!HAS_FFMPEG) return { mean: null, max: null };
  const r = run("ffmpeg", ["-i", file, "-af", "volumedetect", "-f", "null", "NUL"]);
  const meanM = r.out.match(/mean_volume:\s*([-\d.]+)\s*dB/);
  const maxM = r.out.match(/max_volume:\s*([-\d.]+)\s*dB/);
  return {
    mean: meanM ? parseFloat(meanM[1]) : null,
    max: maxM ? parseFloat(maxM[1]) : null,
  };
}

/** Higher is better. */
function scoreVariant(fx, metrics) {
  let score = 0;
  const notes = [];
  const [d0, d1] = fx.target_duration || [0.2, 2];
  const [m0, m1] = fx.target_mean_db || [-40, -10];

  if (metrics.duration == null) {
    score -= 5;
    notes.push("no duration probe");
  } else if (metrics.duration < d0) {
    score -= 8;
    notes.push(`too short ${metrics.duration.toFixed(2)}s`);
  } else if (metrics.duration > d1) {
    score -= 3;
    notes.push(`long ${metrics.duration.toFixed(2)}s`);
  } else {
    score += 10;
    notes.push(`duration ok ${metrics.duration.toFixed(2)}s`);
  }

  if (metrics.mean == null) {
    score -= 5;
    notes.push("no loudness");
  } else if (metrics.mean < m0) {
    // too quiet — beds often fail this way
    score -= 12 + Math.min(20, (m0 - metrics.mean) * 0.5);
    notes.push(`too quiet mean ${metrics.mean.toFixed(1)}dB`);
  } else if (metrics.mean > m1) {
    score -= 6 + Math.min(15, (metrics.mean - m1) * 0.4);
    notes.push(`too hot mean ${metrics.mean.toFixed(1)}dB`);
  } else {
    score += 12;
    notes.push(`mean ok ${metrics.mean.toFixed(1)}dB`);
  }

  if (metrics.max != null) {
    if (metrics.max > -0.5) {
      score -= 10;
      notes.push(`clip risk max ${metrics.max.toFixed(1)}dB`);
    } else if (metrics.max > -3) {
      score -= 2;
      notes.push(`hot peaks ${metrics.max.toFixed(1)}dB`);
    } else if (metrics.max < -40) {
      score -= 8;
      notes.push(`dead peaks ${metrics.max.toFixed(1)}dB`);
    } else {
      score += 4;
      notes.push(`peaks ok ${metrics.max.toFixed(1)}dB`);
    }
  }

  // Prefer some energy for oneshots
  if (fx.role === "oneshot" && metrics.mean != null && metrics.mean > -38 && metrics.mean < -8) {
    score += 3;
  }
  if (fx.role === "bed" && metrics.mean != null && metrics.mean > -38 && metrics.mean < -22) {
    score += 4;
  }

  return { score, notes };
}

async function generateSfx({ apiKey, text, durationSeconds }) {
  const url =
    "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
  const body = {
    text,
    prompt_influence: 0.4,
    duration_seconds: Math.min(8, Math.max(0.7, durationSeconds ?? 1)),
  };
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
    throw new Error(`SFX ${res.status}: ${err.slice(0, 350)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Soft loudness normalize toward target mean using ffmpeg. */
function normalizeFile(src, dest, targetMean = -22) {
  if (!HAS_FFMPEG) {
    copyFileSync(src, dest);
    return false;
  }
  // loudnorm is heavy; use volume filter from measured mean
  const { mean } = probeVolume(src);
  if (mean == null) {
    copyFileSync(src, dest);
    return false;
  }
  const delta = targetMean - mean;
  // clamp boosts
  const adj = Math.max(-12, Math.min(18, delta));
  const r = run("ffmpeg", [
    "-y",
    "-i",
    src,
    "-af",
    `volume=${adj.toFixed(2)}dB`,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    dest,
  ]);
  if (!r.ok) {
    copyFileSync(src, dest);
    return false;
  }
  return true;
}

async function main() {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || "";
  if (!dryRun && !apiKey) {
    console.error("ELEVENLABS_API_KEY required");
    process.exit(2);
  }
  if (!HAS_FFMPEG || !HAS_FFPROBE) {
    console.warn("WARN: ffmpeg/ffprobe not fully available — scoring limited");
  }

  mkdirSync(variantsDir, { recursive: true });
  const report = [];
  report.push("# Channel SFX lab report");
  report.push("");
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`ffmpeg: ${HAS_FFMPEG} · ffprobe: ${HAS_FFPROBE}`);
  report.push("");

  const winners = [];

  for (const fx of catalog.effects) {
    if (only && !only.has(fx.id)) continue;
    console.log(`\n=== ${fx.id} (${fx.variants?.length || 0} variants) ===`);
    report.push(`## ${fx.id}`);
    report.push("");

    const results = [];
    const variants = fx.variants?.length
      ? fx.variants
      : [{ tag: "solo", duration_seconds: fx.duration_seconds || 1, prompt: fx.prompt }];

    for (const v of variants) {
      const name = `${fx.id}__${v.tag}.mp3`;
      const abs = join(variantsDir, name);
      const promptFp = createHash("sha256")
        .update(v.prompt + String(v.duration_seconds ?? ""))
        .digest("hex")
        .slice(0, 12);

      if (!dryRun) {
        process.stdout.write(`  gen ${v.tag}… `);
        try {
          const buf = await generateSfx({
            apiKey,
            text: v.prompt,
            durationSeconds: v.duration_seconds,
          });
          writeFileSync(abs, buf);
          console.log(`${buf.length}b`);
        } catch (e) {
          console.log(`FAIL ${e.message}`);
          report.push(`- **${v.tag}**: FAIL ${e.message}`);
          continue;
        }
        await new Promise((r) => setTimeout(r, 250));
      } else if (!existsSync(abs)) {
        report.push(`- **${v.tag}**: missing (dry-run)`);
        continue;
      }

      const duration = probeDuration(abs);
      const { mean, max } = probeVolume(abs);
      const { score, notes } = scoreVariant(fx, { duration, mean, max });
      results.push({ tag: v.tag, abs, score, notes, duration, mean, max, promptFp, prompt: v.prompt });
      report.push(
        `- **${v.tag}**: score **${score}** · dur=${duration?.toFixed(2) ?? "?"}s · mean=${mean ?? "?"}dB · max=${max ?? "?"}dB — ${notes.join("; ")}`
      );
    }

    if (!results.length) {
      report.push("");
      continue;
    }

    results.sort((a, b) => b.score - a.score);
    const win = results[0];
    report.push("");
    report.push(`**Winner: ${win.tag}** (score ${win.score})`);
    report.push("");
    report.push("```");
    report.push(win.prompt);
    report.push("```");
    report.push("");

    console.log(`  winner → ${win.tag} (score ${win.score})`);

    if (!dryRun) {
      const dest = join(sfxDir, fx.file);
      const targetMean = fx.role === "bed" ? -28 : -20;
      const normed = join(variantsDir, `${fx.id}__${win.tag}__norm.mp3`);
      normalizeFile(win.abs, normed, targetMean);
      // re-score norm; if worse keep raw
      const nv = probeVolume(normed);
      const nd = probeDuration(normed);
      const ns = scoreVariant(fx, { duration: nd, mean: nv.mean, max: nv.max });
      if (ns.score >= win.score - 2) {
        copyFileSync(normed, dest);
        report.push(`Promoted **normalized** (${ns.score}) mean=${nv.mean}dB`);
      } else {
        copyFileSync(win.abs, dest);
        report.push(`Promoted **raw** winner (norm scored ${ns.score})`);
      }
      report.push("");
      winners.push({ id: fx.id, file: `/audio/channel-sfx/${fx.file}`, tag: win.tag, score: win.score });
    }
  }

  // manifest
  if (!dryRun) {
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          schema: "s305.channel_sfx_manifest.v1",
          generatedAt: new Date().toISOString(),
          lab: true,
          clipCount: winners.length,
          clips: winners.map((w) => ({
            id: w.id,
            file: w.file,
            status: "lab-winner",
            score: w.score,
            variant: w.tag,
          })),
        },
        null,
        2
      ) + "\n"
    );
  }

  writeFileSync(labReportPath, report.join("\n") + "\n", "utf8");
  console.log(`\nLab report → ${labReportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
