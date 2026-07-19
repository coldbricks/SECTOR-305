# ORCHESTRATOR PRIME — standing law for the SECTOR 305 swarm

**Version:** 1.1 (2026-07-18 — self-audited revision; v1.0 superseded)
**Precedence:** This file binds the orchestrator and every spawned agent. On
WHAT to build, `docs/PHASE0_SCOPE_MANIFEST.md` rules and this file yields. On
HOW to build, this file rules and yields only to explicit manifest clauses.
Every fresh agent reads this file at spawn, before its task. The orchestrator
re-reads it at every wave boundary. Never summarize it into context — read it
from disk each time.

---

## §0 ARMING SEQUENCE (execute in order before any other work)

1. **Version control.** If `git log` errors: `git init`, commit the entire
   tree as the initial commit. A remote is optional; local history is not.
   Standing rule: **one commit minimum per wave**, message = manifest IDs
   touched. No agent writes a file into an unversioned tree.
2. **Bootstrap the control files** (create if absent):
   - `docs/OWNERSHIP.md` — artifact path → single writer for current wave
   - `docs/waves/` — one plan+ledger file per wave: `WAVE_<date>_<n>.md`
3. **Arming proof.** Confirmation of arming consists of pasted artifacts, not
   assertions: `git log --oneline` output, the ownership-map path, and the
   current wave-plan path. Stated compliance without pasted output is theater
   (§3.1) and does not count as armed.

---

## §1 COMPUTE DOCTRINE — unlimited spend, binding floors, hard scope clamp

This project runs on unlimited compute. Token cost, agent count, and
wall-clock are NOT decision inputs. The only scarce resources are correctness
and the human's review time. Between a cheaper and a costlier path, take the
costlier one unless it is WRONG — "wasteful" is never a reason here.

**Scope clamp (resolves the only tension in this doctrine):** unlimited
compute buys **depth on in-scope work and unlimited verification — never
scope**. The Phase 0 freeze stands absolutely. Building out-of-scope features
(fire/EMS depth, voice paths, multi-county, co-op) is WRONG, not generous.
Gold-plating beyond a manifest floor is legal only after every open finding
and residual is closed.

**Floors (violations, not suggestions):**

1. One agent per manifest sub-ID and one agent per critic finding. Merging
   work-units "for efficiency" is a contract violation even if output looks
   complete.
2. Every finder/critic/auditor task runs until DRY: spawn passes until **two
   consecutive passes produce zero new findings**. Fixed counts ("checked 5
   files") are violations. Convergence valve, per constitution: a finding is a
   **falsifiable defect with evidence** — "could be deeper" is not a finding
   and cannot keep a dry-loop alive.
3. Files are read IN FULL before being reasoned about.
4. Every claim is adversarially verified by a SEPARATE agent prompted to
   refute it. Self-confirmation closes nothing.

**Banned economizer moves (by name):** merging agents; sampling
("representative", "spot-checked", "the pattern holds"); summarize-instead-of-
read; single-pass shipping; premature sufficiency ("this is sufficient for
Phase 0" — sufficiency is decided by acceptance checks and critic rounds,
never by the builder mid-wave).

---

## §2 FAN-OUT DOCTRINE — maximum parallelism, zero collisions

Agents synergize through **frozen interfaces and partitioned ownership**,
never through shared context or chat.

1. **Ownership map.** `docs/OWNERSHIP.md` lists every artifact path → exactly
   one writer agent for the current wave. Editing an unowned file is a
   violation; file a change-request to the orchestrator instead. Any number
   of agents may READ anything.
2. **Interfaces freeze before fan-out.** Schemas (Zod spine), pack JSON
   shapes, and the grade-code vocabulary freeze at wave start. A mid-wave
   interface change stops the wave and goes through one named owner as a
   written amendment. Quiet interface edits are violations.
3. **Dispatch everything independent simultaneously.** Within a stage, ALL
   sub-IDs fan out at once. Serializing independent work is a violation.
   Barriers between stages exist only where the next stage consumes ALL
   prior outputs — each barrier is justified in the wave plan or removed.
4. **Quarantine → integrate.** Agent output lands in a staging path. One
   integrator agent runs that artifact's acceptance check, merges it, runs
   the FULL test suite, and commits. Suite red = wave does not close. Bad
   agents at scale are a statistical certainty — contain, don't hope.
5. **Scale the verify side without limit.** Build-side fan-out is capped by
   seam count; verification is not. Every artifact gets ≥2 independent
   refuter agents; every changed suite gets a mutation pass (§3.2); every
   golden gets a fairness audit (§4.2). Readers cannot collide — when in
   doubt, spawn another skeptic, not another builder.

---

## §3 EVIDENCE & ANTI-THEATER

Work that produced no artifact did not happen. Effort-theater is the same
violation as effort-shaving; both directions get audited.

1. **Evidence-of-spend:** every agent writes full findings to a repo file;
   every closure entry in a ledger contains pasted command output, not
   assertions. "I verified X" without output = X is unverified.
2. **Red before green (mutation protocol):** for every new or changed test,
   the VERIFIER (not the author) corrupts the guarded behavior, runs the
   suite, pastes the red output into the wave ledger, restores, and pastes
   the green output. A test that cannot be made to fail is deleted, not
   shipped. No try/catch, skip, or conditional may wrap an assertion such
   that its failure is swallowed.
3. **Behavior, not counts:** a vocabulary item, template, matrix row, or code
   path counts as DONE only when a fixture exercises it end-to-end.
   Existence in a list is not evidence. Acceptance checks reference
   behavior, never counts.
4. **No self-closure:** the agent that fixed a finding does not declare it
   closed. Closure = a separate verifier runs the finding's acceptance check
   and pastes the output into the ledger.

---

## §4 GRADING INTEGRITY (project-specific carefulness laws)

1. **Truth only through the knowable gate — mechanically enforced.** Grading
   code may read `IncidentTruth` only through the knowable-set gate
   (`isHighAcuityKnowable` or equivalent). Every direct `truth.` read that is
   deliberately gate-exempt carries an inline tag on the same line or the
   line above: `// TRUTH-GATE-OK(<doctrine clause>)`, plus a fixture proving
   pre-cue player actions do not hard-fail. Enforcement is a grep guard test:
   any `truth\.` match in grading/runtime modules without the tag or the gate
   call in scope fails CI. Untagged truth reads are violations.
2. **Goldens are humanly playable.** Every golden pass session must be
   replayable by a person who sees only what the timeline has revealed. An
   automated check asserts no command uses a truth-derived fact before its
   `becomesKnowableAtMs`. A golden that requires clairvoyance is a contract
   defect, not a fixture.
3. **The sacred invariant stays sacred.** SessionRecord headless replay →
   identical hard multiset, verified by tests that CAN fail (§3.2 applies
   with extra force here).

---

## §5 EXTERNAL CRITIC INTAKE

`docs/CRITIC_ROUND_EXTERNAL_CLAUDE.md` is standing Round-2 input. For each
FINDING the only legal responses are:

- **FIX** — ship the change plus the finding's listed acceptance check, shown
  RUNNING (red then green where mutation-style), evidence pasted into the
  Round-2 entry of `docs/CRITIC_ROUNDS.md`, or
- **REFUTE** — cite file:line evidence the finding is factually wrong, in the
  same ledger.

"Acknowledged", "tracked", "will address", or severity reclassification
without evidence are contract violations. Zero-finding rounds cannot be
claimed while any finding in that file is open. Future external critic files
follow the same protocol.

---

## §6 WAVE LOOP (the operating cycle)

1. Re-read this file. Re-read open critic findings.
2. Write the wave plan to `docs/waves/WAVE_<date>_<n>.md`: sub-IDs in scope,
   ownership-map update, frozen interfaces, barriers (each justified),
   planned FIX/REFUTE disposition per open finding.
3. Dispatch ALL independent agents simultaneously (§2.3).
4. Quarantine outputs; integrator verifies per-artifact, merges, runs full
   suite, commits (§2.4, §0.1).
5. Verification fan-out: refuters, mutation pass, fairness audit (§2.5, §3.2,
   §4.2).
6. Wave-boundary self-check: state in the ledger what MORE could have been
   done with unlimited compute; do it, or log why it is WRONG (not why it is
   expensive). "Nothing more" is valid only after two consecutive dry passes
   (§1 floor 2).
7. Close the ledger: evidence pasted, findings opened/closed, commit hash.
8. **Escalate to the human only for:** scope-freeze exceptions, manifest
   amendments, interface-freeze breaks, and kill-list tension. Everything
   else proceeds autonomously. Silent scope drift and needless stalls are
   both violations.

---

## §7 DECAY & CONTEXT COUNTERMEASURES

Long-running context drifts toward default frugality, and a full context
economizes involuntarily. Therefore:

1. Every fresh subagent reads this file at spawn — full strength every time.
2. The orchestrator is a **thin router**: its context holds routing, wave
   state, and ledger pointers only. Any analysis longer than a screen of
   text happens inside a spawned agent that reads from disk and writes to
   disk. If the orchestrator finds itself reading file contents at length,
   summarizing, or self-closing findings — that IS the drift. Re-read this
   file and re-arm.
