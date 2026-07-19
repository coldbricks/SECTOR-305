import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HARD_FAIL_CODES, SOFT_MARK_CODES } from "../src/grade/codes.js";
import { RADIO_TEMPLATES } from "../src/radio/templates.js";
import { buildStatusMatrix } from "../src/doctrine/statusMatrix.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|md|json|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("M17 kill-list + constitution guards", () => {
  it("hard fail vocabulary has at least 24 codes", () => {
    expect(HARD_FAIL_CODES.length).toBeGreaterThanOrEqual(24);
  });

  it("soft mark vocabulary has at least 15 codes", () => {
    expect(SOFT_MARK_CODES.length).toBeGreaterThanOrEqual(15);
  });

  it("radio templates at least 12", () => {
    expect(RADIO_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it("status matrix 64 cells", () => {
    expect(buildStatusMatrix().length).toBe(64);
  });

  it("forbids fake credential phrases in product sources", () => {
    const files = walk(join(root, "packages")).concat(walk(join(root, "docs")));
    const banned =
      /APCO certified|NENA approved|IAED certified|you are now a certified telecommunicator/i;
    const offenders: string[] = [];
    for (const f of files) {
      if (f.includes("KILL_LIST") || f.includes("CONTENT_POLICY") || f.includes("RUBRIC") || f.includes("DOCTRINE") || f.includes("ADVERSARIAL") || f.includes("PHASE0") || f.includes("WEAKNESS") || f.includes("BRIEF") || f.includes("CLAUDE") || f.includes("codes.ts") || f.includes("kill_list"))
        continue;
      const text = readFileSync(f, "utf8");
      // allow negation contexts
      if (banned.test(text) && !/not.*APCO|never.*certified|Not APCO|not official APCO/i.test(text)) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("core has no if(miami) / packId miami branches", () => {
    const coreFiles = walk(join(root, "packages/core/src"));
    const bad: string[] = [];
    for (const f of coreFiles) {
      const text = readFileSync(f, "utf8");
      if (/if\s*\(\s*packId\s*===\s*['\"]miami/i.test(text)) bad.push(f);
      if (/if\s*\(\s*pack\.id\s*===\s*['\"]miami/i.test(text)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });

  it("web source does not import STT/speech recognition required path", () => {
    const webFiles = walk(join(root, "packages/web/src"));
    for (const f of webFiles) {
      const text = readFileSync(f, "utf8");
      expect(text).not.toMatch(/webkitSpeechRecognition|SpeechRecognition|whisper|faster-whisper/i);
    }
  });
});
