/**
 * Sample-driven radio speech engine.
 * Input: speech_rules.json + lexicon units/voices
 * Output: expanded line objects for TTS bake
 *
 * You author *samples* (patterns). The program builds the matrix.
 */

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Compound number (callsign parts): 12 → twelve, 21 → twenty-one */
export function speakNumberCompound(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return String(n);
  if (x < 20) return ONES[x];
  if (x < 100) {
    const t = Math.floor(x / 10);
    const o = x % 10;
    return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
  }
  return speakNumberDigits(String(x));
}

/** Radio clock / badge style: 2121 → "two one two one", 0830 → "zero eight three zero" */
export function speakNumberDigits(raw) {
  const digits = String(raw).replace(/\D/g, "");
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  return digits
    .split("")
    .map((d) => words[Number(d)] ?? d)
    .join(" ");
}

export function speakTimeHhmm(hhmm) {
  const s = String(hhmm).padStart(4, "0").slice(0, 4);
  return speakNumberDigits(s);
}

/**
 * 3A12 + LAPD → "three Adam twelve"
 * 3A12 + NATO → "three Alpha twelve"
 * Digit-by-digit optional for prefix: "three Adam one two" via mode
 */
export function speakCallsign(callsign, letters, opts = {}) {
  const digitMode = opts.digitMode === "digits" ? "digits" : "compound";
  const speakNum = digitMode === "digits" ? speakNumberDigits : speakNumberCompound;
  const raw = String(callsign).toUpperCase().trim();
  const m = raw.match(/^(\d+)([A-Z]+)(\d+)$/);
  if (!m) {
    return raw
      .split("")
      .map((ch) => {
        if (/[A-Z]/.test(ch)) return letters[ch] || ch;
        if (/\d/.test(ch)) return speakNum(ch);
        return ch;
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const [, pre, mid, suf] = m;
  const midSpoken = mid
    .split("")
    .map((ch) => letters[ch] || ch)
    .join(" ");
  // House style: prefix compound ("three"), suffix compound ("twelve") — classic LAPD unit speak
  // Optional digitMode digits makes "three Adam one two"
  const preSpoken =
    digitMode === "digits" ? speakNumberDigits(pre) : speakNumberCompound(pre);
  const sufSpoken =
    digitMode === "digits" ? speakNumberDigits(suf) : speakNumberCompound(suf);
  return `${preSpoken} ${midSpoken} ${sufSpoken}`;
}

function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

/**
 * Expand speech_rules samples against units → line list.
 * @param {object} rules speech_rules.json
 * @param {object} lex lexicon.json (units, voices)
 * @param {{ full?: boolean }} opts
 */
export function expandFromSamples(rules, lex, opts = {}) {
  const full = !!opts.full;
  const lines = [];
  const seen = new Set();
  const push = (line) => {
    if (seen.has(line.id)) return;
    seen.add(line.id);
    lines.push(line);
  };

  const lapd = rules.phonetic?.LAPD ?? {};
  const nato = rules.phonetic?.NATO ?? {};
  const timesAll = rules.numerics?.time_samples ?? ["1200", "2121"];
  const timesDefault = rules.budget?.default_time_subset ?? timesAll.slice(0, 8);
  const times = full && rules.budget?.full_uses_all_time_samples !== false
    ? timesAll
    : timesDefault;

  const units = lex.units ?? [];

  // --- Unit status matrix from samples ---
  for (const unit of units) {
    const cs = unit.callsign;
    const voice = unit.voice;
    const spokenLapd = speakCallsign(cs, lapd);
    const baseVars = {
      callsign: cs,
      callsign_spoken: spokenLapd,
    };

    for (const sample of rules.samples?.unit_status ?? []) {
      if (sample.expand_times) {
        for (const t of times) {
          const vars = {
            ...baseVars,
            time_hhmm: t,
            time_spoken: speakTimeHhmm(t),
          };
          push({
            id: `unit_${cs.toLowerCase()}_${sample.id}_${t}`,
            voice,
            text: fill(sample.pattern, vars),
            match: (sample.match ?? []).map((m) => fill(m, vars)),
            kind: sample.kind || "STATUS",
            scenarioIds: ["*"],
            meta: { sample: sample.id, phonetic: "LAPD", time: t, callsign: cs },
          });
        }
      } else {
        push({
          id: `unit_${cs.toLowerCase()}_${sample.id}`,
          voice,
          text: fill(sample.pattern, baseVars),
          match: (sample.match ?? []).map((m) => fill(m, baseVars)),
          kind: sample.kind || "STATUS",
          scenarioIds: ["*"],
          meta: { sample: sample.id, phonetic: "LAPD", callsign: cs },
        });
      }
    }
  }

  // --- Dispatch templates touching units / time ---
  for (const sample of rules.samples?.dispatch_unit ?? []) {
    const voice = sample.voice || "dispatch";
    if (sample.once_per_time && sample.expand_times) {
      for (const t of times) {
        const vars = {
          callsign: "",
          callsign_spoken: "",
          time_hhmm: t,
          time_spoken: speakTimeHhmm(t),
        };
        push({
          id: `disp_${sample.id}_${t}`,
          voice,
          text: fill(sample.pattern, vars),
          match: (sample.match ?? []).map((m) => fill(m, vars)),
          kind: sample.kind || "SYSTEM",
          scenarioIds: ["*"],
          meta: { sample: sample.id, time: t },
        });
      }
      continue;
    }

    for (const unit of units) {
      const cs = unit.callsign;
      const spokenLapd = speakCallsign(cs, lapd);
      if (sample.expand_times) {
        for (const t of times) {
          const vars = {
            callsign: cs,
            callsign_spoken: spokenLapd,
            time_hhmm: t,
            time_spoken: speakTimeHhmm(t),
          };
          push({
            id: `disp_${sample.id}_${cs.toLowerCase()}_${t}`,
            voice,
            text: fill(sample.pattern, vars),
            match: (sample.match ?? []).map((m) => fill(m, vars)),
            kind: sample.kind || "QUERY",
            scenarioIds: ["*"],
            meta: { sample: sample.id, callsign: cs, time: t },
          });
        }
      } else {
        const vars = { callsign: cs, callsign_spoken: spokenLapd };
        push({
          id: `disp_${sample.id}_${cs.toLowerCase()}`,
          voice,
          text: fill(sample.pattern, vars),
          match: (sample.match ?? []).map((m) => fill(m, vars)),
          kind: sample.kind || "QUERY",
          scenarioIds: ["*"],
          meta: { sample: sample.id, callsign: cs },
        });
      }
    }
  }

  // --- NATO parallel pack (same traffic, different alphabet) ---
  const natoPack = rules.samples?.nato_callsign_pack;
  if (natoPack?.enabled) {
    const tmplIds = new Set(natoPack.unit_templates ?? ["copy", "enroute"]);
    const natoTimes = natoPack.time_subset ?? times.slice(0, 5);
    const unitSamples = (rules.samples?.unit_status ?? []).filter((s) =>
      tmplIds.has(s.id)
    );
    for (const unit of units) {
      const cs = unit.callsign;
      const spokenNato = speakCallsign(cs, nato);
      for (const sample of unitSamples) {
        if (sample.expand_times) {
          for (const t of natoTimes) {
            const vars = {
              callsign: cs,
              callsign_spoken: spokenNato,
              time_hhmm: t,
              time_spoken: speakTimeHhmm(t),
            };
            push({
              id: `nato_unit_${cs.toLowerCase()}_${sample.id}_${t}`,
              voice: unit.voice,
              text: fill(sample.pattern, vars),
              match: [
                ...((sample.match ?? []).map((m) => fill(m, { ...vars, callsign_spoken: spokenNato }))),
                `NATO ${cs}`,
              ],
              kind: sample.kind || "STATUS",
              scenarioIds: ["*"],
              meta: { sample: sample.id, phonetic: "NATO", time: t, callsign: cs },
            });
          }
        } else {
          const vars = { callsign: cs, callsign_spoken: spokenNato };
          push({
            id: `nato_unit_${cs.toLowerCase()}_${sample.id}`,
            voice: unit.voice,
            text: fill(sample.pattern, vars),
            match: (sample.match ?? []).map((m) => fill(m, vars)),
            kind: sample.kind || "STATUS",
            scenarioIds: ["*"],
            meta: { sample: sample.id, phonetic: "NATO", callsign: cs },
          });
        }
      }
    }
  }

  // --- Numeric atoms (0-9, teens, tens) — tiny reusable bank ---
  if (rules.samples?.numeric_atoms?.enabled) {
    const digits = rules.numerics?.digit_words ?? ONES.slice(0, 10);
    if (rules.samples.numeric_atoms.digits) {
      digits.forEach((w, i) => {
        push({
          id: `num_digit_${i}`,
          voice: "dispatch",
          text: w + ".",
          match: [String(i), w],
          kind: "SYSTEM",
          scenarioIds: ["*"],
          meta: { sample: "numeric_atom", value: i },
        });
      });
    }
    if (rules.samples.numeric_atoms.teens_and_tens) {
      for (let i = 10; i <= 19; i++) {
        push({
          id: `num_n_${i}`,
          voice: "dispatch",
          text: ONES[i] + ".",
          match: [String(i), ONES[i]],
          kind: "SYSTEM",
          scenarioIds: ["*"],
          meta: { sample: "numeric_atom", value: i },
        });
      }
      for (const t of [20, 30, 40, 50]) {
        push({
          id: `num_n_${t}`,
          voice: "dispatch",
          text: speakNumberCompound(t) + ".",
          match: [String(t)],
          kind: "SYSTEM",
          scenarioIds: ["*"],
          meta: { sample: "numeric_atom", value: t },
        });
      }
    }
  }

  return {
    lines,
    stats: {
      lineCount: lines.length,
      charEstimate: lines.reduce((a, l) => a + l.text.length, 0),
      timesUsed: times.length,
      full,
      units: units.length,
    },
  };
}

/** Demo: expand one sample the way a dispatcher would say it */
export function demoSample() {
  const lapd = {
    A: "Adam", C: "Charles", S: "Sam", T: "Tom",
  };
  // partial — full alphabets live in speech_rules.json
  return {
    example_lapd: speakCallsign("3A12", {
      A: "Adam", B: "Boy", C: "Charles", D: "David", E: "Edward", F: "Frank",
      G: "George", H: "Henry", I: "Ida", J: "John", K: "King", L: "Lincoln",
      M: "Mary", N: "Nora", O: "Ocean", P: "Paul", Q: "Queen", R: "Robert",
      S: "Sam", T: "Tom", U: "Union", V: "Victor", W: "William", X: "X-Ray",
      Y: "Yellow", Z: "Zebra",
    }),
    example_nato: speakCallsign("3A12", {
      A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
      G: "Golf", H: "Hotel", I: "India", J: "Juliet", K: "Kilo", L: "Lima",
      M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
      S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray",
      Y: "Yankee", Z: "Zulu",
    }),
    example_time: speakTimeHhmm("2121"),
    example_line: `${speakCallsign("3A12", {
      A: "Adam", B: "Boy", C: "Charles", D: "David", E: "Edward", F: "Frank",
      G: "George", H: "Henry", I: "Ida", J: "John", K: "King", L: "Lincoln",
      M: "Mary", N: "Nora", O: "Ocean", P: "Paul", Q: "Queen", R: "Robert",
      S: "Sam", T: "Tom", U: "Union", V: "Victor", W: "William", X: "X-Ray",
      Y: "Yellow", Z: "Zebra",
    })}, back in service ${speakTimeHhmm("2121")}.`,
  };
}
