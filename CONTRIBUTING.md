# Contributing to SECTOR 305

SECTOR 305 values operational coherence over feature count. A contribution should make the instrument fairer, clearer, more deterministic, or more defensible.

## Start here

Read:

1. `CLAUDE.md`
2. `docs/DOCTRINE.md`
3. `docs/RUBRIC.md`
4. `docs/ARCHITECTURE.md`
5. `docs/CONTENT_POLICY.md`

## Development setup

```bash
npm install
npm run typecheck
npm test
npm run test:e2e
```

## Pull-request expectations

- Explain the operator or instructor impact.
- Identify the doctrine, scenario, or presentation seam changed.
- Add a failing behavioral test before the implementation.
- Preserve deterministic `SessionRecord` replay.
- Keep hidden truth out of the operator information set until its authored cue.
- Run typechecking, core tests, browser acceptance, pack validation, and production build.
- Include screenshots for visible interface changes.

## Content and data rules

- Do not submit real incident records, personally identifying information, operationally sensitive data, or agency-restricted materials.
- Do not submit third-party exports unless their license expressly allows repository redistribution.
- RadioReference premium exports are not acceptable contributions.
- Fictional scenarios must remain trauma-aware and avoid shock-value design.
- Never imply official agency, APCO, NENA, or IAED endorsement.

## High-value reports

The most useful issue reports include:

- Scenario seed and simulated clock
- The command sequence or exported `SessionRecord`
- Expected doctrine outcome
- Actual grade code and evidence
- Screenshot or console output when presentation is involved

Disagreement with a rubric rule is welcome. Make the argument reproducible.
