/**
 * §4.1 mechanical truth-gate: every truth. in runtime must be on a line with
 * TRUTH-GATE-OK or isHighAcuityKnowable in the surrounding function scope.
 * Simple line-based: each truth. line must contain TRUTH-GATE-OK or be inside
 * isHighAcuityKnowable function body or on a line with isHighAcuityKnowable call.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const runtimePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/runtime.ts"
);

describe("D-TRUTHGREP untagged truth. reads", () => {
  it("every truth. line in runtime.ts is tagged or gated", () => {
    const src = readFileSync(runtimePath, "utf8");
    const lines = src.split(/\r?\n/);
    const offenders: string[] = [];

    // Track if we're inside isHighAcuityKnowable method
    let inGateFn = false;
    let braceDepth = 0;
    let gateFnStarted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const n = i + 1;

      if (line.includes("isHighAcuityKnowable(") && line.includes("{")) {
        inGateFn = true;
        gateFnStarted = true;
        braceDepth = 0;
      }
      if (inGateFn) {
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }
        if (gateFnStarted && braceDepth <= 0 && line.includes("}")) {
          // may close on same line as start
          if (!(line.includes("isHighAcuityKnowable") && line.includes("{"))) {
            inGateFn = false;
            gateFnStarted = false;
          }
        }
      }

      if (!line.includes("truth.")) continue;
      // comments only
      const code = line.replace(/\/\/.*$/, "");
      if (!code.includes("truth.")) continue;

      const prev = i > 0 ? lines[i - 1]! : "";
      const tagged =
        line.includes("TRUTH-GATE-OK") ||
        prev.includes("TRUTH-GATE-OK") ||
        line.includes("isHighAcuityKnowable") ||
        inGateFn;

      if (!tagged) {
        offenders.push(`${n}: ${line.trim()}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
