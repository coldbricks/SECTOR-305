# SECTOR 305 — PHASE 0 SCOPE MANIFEST

**Status:** BINDING CONTRACT — human checkpoint required before build fan-out  
**Date:** 2026-07-18  
**Constitution:** `docs/ADVERSARIAL_VOLLEY.md` · `docs/ARCHITECTURE.md` · `docs/BRIEF.md` · `CLAUDE.md`  
**Sacred invariant:** A `SessionRecord` replayed headless MUST produce the **identical multiset of hard `GradeEvent.code` values** (order of hard fails may be sorted for comparison; codes + severity + incidentId + ruleRef must match). Soft marks and notes are also deterministic and asserted in goldens where specified.

**Epistemic law:** All doctrine is **fictional house law (S305 / A07)** — standards-aligned, not any real agency SOP, not IAED card text, not APCO/NENA credentials.

**Phase 0 freeze (absolute):** One sector · police A-console only · text radio + structured commands · no STT-required path · no multi-county · no fire/EMS depth · no co-op · shell≠glass.

**Existing seed disclaimer:** Prior scaffold (`packages/core`, thin UI, partial pack) is **non-authoritative**. Phase 0 close requires every row below as a shipped artifact meeting its acceptance criteria. Seed code may be refactored or replaced; it does not count as “done” by existence alone.

---

## How to read this manifest

| Column | Meaning |
|--------|---------|
| **ID** | Stable manifest ID (never renumber mid-contract without human amend) |
| **Artifact path** | Concrete file(s) that MUST exist at Phase 0 close |
| **Owner agent** | Dedicated fan-out agent for first production of content |
| **Numeric floor** | Minimum measurable depth; under floor = incomplete |
| **Acceptance** | Binary exit checks (tests, counts, invariants) |
| **Constitutional link** | Which law it satisfies |

**Banned language in all artifacts:** TODO, “later”, “simplified”, “representative sample”, “etc.”, stub-only functions, happy-path-only.

**Agent fan-out minimum:** One agent per top-level ID (M01–M22). Large items already split into sub-IDs (M01a–M01f, M02a–M02c, M03a–M03h). **Sub-IDs each get their own agent.** Do not merge for efficiency.

---

# PART A — DOCTRINE (machine law + human law)

## M01 — Full DOCTRINE tables

### M01a — Priority policy (P0–P5)

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/DOCTRINE.md` §Priority · `packs/miami-a07-police-v0/priorities.json` · `packages/core/src/doctrine/priority.ts` |
| **Owner agent** | DOCTRINE-PRIORITY |
| **Numeric floor** | Exactly **6** priority codes P0–P5; each has: name, definition (full paragraph), information requirements, dispatch SLA ms, stack allowed (bool), radio preempt level, reclass-up rules, reclass-down rules, examples (≥3 natures each), hard-fail conditions |
| **Acceptance** | Zod validates 6 rows; every nature in pack maps to a default priority; unit tests cover upgrade, undercode, hold-forbidden on P0–P1; SLA timers fire `FAIL_PRIORITY_AGING` in headless sim |
| **Link** | Non-negotiable R3; C2; kill “priority as paint” |

**Required table columns (each priority row):**

1. `code`  
2. `name`  
3. `definition`  
4. `knowable_cues` (what player must see in CFS/flags/notes before grading undercode)  
5. `dispatch_sla_ms`  
6. `stack_allowed`  
7. `radio_preempt` ∈ {full, high, medium, low, none}  
8. `min_units_default`  
9. `requires_backup_natures` (list)  
10. `liability_timestamps_touched` (which CFS stamps must exist after actions at this priority)

**Reclass rules (must be explicit, not vibes):**

- **Upgrade:** Immediate on new knowable cue; log note required; radio re-tone required if units already DIS/ER  
- **Downgrade:** Allowed only with documented reason field; if any unit ER/OS → soft mark `SOFT_DOWNGRADE_WHILE_ROLLING`; if weapons flag still true → hard fail `FAIL_PRIORITY_UNDERCODE`  
- **Uncertainty default:** Higher of two candidate priorities  
- **Information-set fairness:** No hard fail for undercode if truth weapons/IP never entered knowable set (C10)

**Liability timestamps (CFS):** `receivedAtMs`, `enteredAtMs`, `priorityHistory[]` (each: atMs, from, to, reason, author), `firstDispatchAtMs`, `firstEnRouteAtMs`, `firstOnSceneAtMs`, `lastUpdateAtMs`, `clearedAtMs`

---

### M01b — Unit status finite-state machine (exhaustive)

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/DOCTRINE.md` §UnitStatus · `packs/miami-a07-police-v0/unit_statuses.json` · `packages/core/src/doctrine/unitStatus.ts` · `packages/core/tests/unit_status_matrix.test.ts` |
| **Owner agent** | DOCTRINE-STATUS |
| **Numeric floor** | **8** statuses: AVL, DIS, ER, OS, CLR, OOS, BSI, EMR. Matrix size **8×8 = 64** cells: each cell LEGAL or ILLEGAL with reason code. All 64 enumerated in JSON + tested. |
| **Acceptance** | Property test: random walk never takes illegal edge; every illegal edge produces `FAIL_STATUS_ILLEGAL` when forced; every legal edge succeeds; assignable flags correct; dirty-close detection |
| **Link** | R4; C3; kill “status cosmetics” |

**Per-status fields:**

1. `code`  
2. `name`  
3. `assignable`  
4. `radio_required_on_enter` (bool)  
5. `clears_assignment_on_enter` (bool)  
6. `legal_next[]`  
7. `illegal_next[]` with `fail_code`  
8. `timer_hooks` (overdue thresholds if any)

**Mandatory illegal examples (non-exhaustive of the 64 — the JSON holds all 64):**

- AVL→OS, AVL→ER, AVL→CLR  
- DIS→OS (skip ER)  
- OOS→DIS, OOS→ER, OOS→OS  
- EMR→DIS (must leave EMR via OS/AVL/OOS only per pack)  
- CLR→OS, CLR→ER, CLR→DIS  

---

### M01c — Radio protocol (complete templates + readbacks + emergency + step-on)

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/DOCTRINE.md` §Radio · `packs/miami-a07-police-v0/radio_templates.json` · `packages/core/src/radio/templates.ts` · `packages/core/src/radio/parser.ts` · `packages/core/src/radio/net_scheduler.ts` · `packages/core/tests/radio_protocol.test.ts` |
| **Owner agent** | DOCTRINE-RADIO |
| **Numeric floor** | ≥ **12** named templates; ≥ **8** required-element profiles by message kind; readback rules for P0/P1 and truth-acuity; emergency traffic mode state machine; step-on and incomplete as first-class `RadioEvent.flags` |
| **Acceptance** | Template engine fills slots → `RadioEvent` with caption always; missing required slots → grade; readback timeout → `FAIL_NO_READBACK`; emergency hold → `FAIL_RADIO_EMERGENCY_TRAFFIC` for routine TX; step-on inject sets `flags.stepOn` + `incomplete` without player mic |
| **Link** | R6; C5; C9; RADIO steelman Phase 0 |

**Template inventory (all required in Phase 0 pack):**

1. `DISPATCH_ASSIGN`  
2. `DISPATCH_ADD_UNIT`  
3. `DISPATCH_CANCEL`  
4. `DISPATCH_REASSIGN`  
5. `STATUS_QUERY`  
6. `STATUS_CORRECTION`  
7. `READBACK_PROMPT`  
8. `EMERGENCY_TRAFFIC_OPEN`  
9. `EMERGENCY_TRAFFIC_CLEAR`  
10. `BOLO`  
11. `WELFARE_CHECK_DISPATCH`  
12. `GENERAL_BROADCAST`  

**Each template fields:** `id`, `kind`, `required_slots[]`, `optional_slots[]`, `caption_pattern`, `requires_readback_when`, `preempt_level`

**Slots (closed set Phase 0):** `to_units`, `from_console`, `priority`, `nature`, `location`, `cross_street`, `safety`, `cfs_number`, `status`, `direction`, `description`, `reason`, `channel`

**Channel model Phase 0:** single primary `SE305-PRI` + boolean `channelEmergency`; dual-watch out of Phase 0.

**Step-on / incomplete as content:** scenario timeline may inject `RadioInject.step_on` and `RadioInject.squelch_cut` producing unit RX with `incomplete: true` and partial caption; player graded on follow-up query when doctrine requires clarification for P1.

---

### M01d — CFS lifecycle + append-only narrative

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/DOCTRINE.md` §CFS · `packs/miami-a07-police-v0/cfs_lifecycle.json` · `packages/core/src/doctrine/cfsLifecycle.ts` · `packages/core/tests/cfs_lifecycle.test.ts` |
| **Owner agent** | DOCTRINE-CFS |
| **Numeric floor** | **7** incident statuses: PENDING, DISPATCHED, WORKING, HOLD, CLEARED, CANCELLED, LINKED_DUP (or 6 if LINKED_DUP is flag — pick 7 states total including HOLD); full transition matrix; **9** disposition codes minimum |
| **Acceptance** | Illegal CFS transitions blocked; notes append-only (no edit/delete API); clear without disposition → `FAIL_NO_DISPOSITION`; clear with dirty units → `FAIL_STATUS_DIRTY_CLOSE`; all liability timestamps set on correct edges |
| **Link** | R2; R7; R11 |

**Narrative rules:**

- `CadNote` only via append command  
- System notes for every automatic status change  
- Player notes optional but required soft mark if weapons reclass without note  
- Disposition closed set from pack  

---

### M01e — Location confidence model

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/DOCTRINE.md` §Location · `packs/miami-a07-police-v0/location_confidence.json` · `packages/core/src/doctrine/location.ts` · UI map contract in M07 |
| **Owner agent** | DOCTRINE-LOCATION |
| **Numeric floor** | **4** levels: `unverified`, `partial`, `verified`, `conflicting` — each with: definition, how player achieves it, map rendering rules, dispatch restrictions by priority/truth acuity, grade codes |
| **Acceptance** | High-acuity dispatch at unverified/conflicting → `FAIL_NO_VERIFY`; verified wrong zone vs truth → `FAIL_WRONG_LOCATION`; map never shows truth pin while confidence &lt; verified; unit icons use last-known only |
| **Link** | R5; C1; kill omniscient map |

**Map behavioral restrictions (Phase 0 imperfect map):**

| Confidence | CFS map marker | Truth pin | Unit GPS |
|------------|----------------|----------|----------|
| unverified | amber vague zone blob only | hidden | last-known zone centroid lag |
| partial | cyan approximate block | hidden | last-known |
| verified | green pin at stated location | hidden | last-known |
| conflicting | red split markers | hidden | last-known |

Truth coordinates exist only in `IncidentTruth` and grader.

---

### M01f — Resource-appropriateness rules

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/DOCTRINE.md` §Assignment · `packs/miami-a07-police-v0/assignment.json` · `packages/core/src/doctrine/assignment.ts` · `packages/core/tests/assignment.test.ts` |
| **Owner agent** | DOCTRINE-ASSIGN |
| **Numeric floor** | Unit types ≥ **4** (patrol, supervisor, traffic, k9); scoring weights documented; backup matrix by nature/priority; jurisdiction soft/hard rules for 5 zones in sector; cannot assign non-assignable |
| **Acceptance** | P1 weapons/robbery-IP requires ≥2 units → `FAIL_NO_BACKUP`; OOS assign → hard fail; traffic-only nature prefers traffic type (soft if patrol used when traffic AVL); “closest only” algorithm forbidden — must score type + status + zone + backup |
| **Link** | R9; C4; kill closest-green-icon |

**Assignment score inputs (all used):** zone match, type fit, assignable, already assigned lower priority divert cost, supervisor requirement flags, language capability optional Phase 0 soft.

---

## M02 — Full RUBRIC

### M02a — Exhaustive FAIL_ vocabulary

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/RUBRIC.md` · `packs/miami-a07-police-v0/rubric.json` · `packages/core/src/grade/codes.ts` |
| **Owner agent** | RUBRIC-HARD |
| **Numeric floor** | ≥ **40** distinct hard-fail codes OR prove closed set smaller with 1:1 mapping of all 14 non-negotiables × all C1–C10 triggers; each code: id, severity, domain, message template, ruleRef, linked non-negotiable IDs, linked challenge IDs, test fixture name |
| **Acceptance** | Every C1–C10 has ≥1 hard or soft code path; every R1–R14 has ≥1 code; no orphan codes; TypeScript const enum / union exhaustiveness |
| **Link** | R14; ARENA fail-code moat |

**Minimum hard-fail code list (closed set for Phase 0 — all must exist):**

1. `FAIL_NO_VERIFY`  
2. `FAIL_WRONG_LOCATION`  
3. `FAIL_PRIORITY_UNDERCODE`  
4. `FAIL_PRIORITY_AGING`  
5. `FAIL_HOLD_HIGH_PRIORITY`  
6. `FAIL_NO_BACKUP`  
7. `FAIL_UNIT_NOT_ASSIGNABLE`  
8. `FAIL_UNIT_WRONG_TYPE`  
9. `FAIL_STATUS_ILLEGAL`  
10. `FAIL_STATUS_DIRTY_CLOSE`  
11. `FAIL_STATUS_STALE`  
12. `FAIL_NO_READBACK`  
13. `FAIL_RADIO_FORMAT`  
14. `FAIL_RADIO_EMERGENCY_TRAFFIC`  
15. `FAIL_SAFETY_NOT_AIRED`  
16. `FAIL_NO_DISPOSITION`  
17. `FAIL_NARRATIVE_MISSING_CRITICAL`  
18. `FAIL_JURISDICTION`  
19. `FAIL_DIVERT_WITHOUT_LOG`  
20. `FAIL_CHANNEL_ABANDON` (lost second high-acuity under concurrency)  
21. `FAIL_INFOSET_VIOLATION` (grader bug guard — should never fire on player; test only)  
22. `FAIL_READBACK_WRONG` (ack content fails required slots when structured ack present)  
23. `FAIL_RECLASS_NO_RADIO` (priority upgrade with units rolling, no re-tone)  
24. `FAIL_DOUBLE_ASSIGN_CONFLICT`  

**Mapping tables required in RUBRIC.md:**

- Table A: FAIL_code → R1–R14  
- Table B: FAIL_code → C1–C10  
- Table C: FAIL_code → PlayerCommand or timer trigger  

---

### M02b — Soft-mark taxonomy

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/RUBRIC.md` §Soft · `packs/miami-a07-police-v0/rubric_soft.json` |
| **Owner agent** | RUBRIC-SOFT |
| **Numeric floor** | ≥ **15** soft codes with weights 1–5 |
| **Acceptance** | Soft marks never flip checkride alone unless pack sets `maxSoftWeight`; debrief lists them; goldens assert presence/absence where specified |
| **Link** | Coaching track; not confetti |

**Minimum soft codes:**  
`SOFT_PRIORITY_LOW`, `SOFT_RADIO_FORMAT`, `SOFT_RADIO_WORDY`, `SOFT_SLOW_KEY`, `SOFT_DOWNGRADE_WHILE_ROLLING`, `SOFT_NOTE_THIN`, `SOFT_UNIT_SUBOPTIMAL_TYPE`, `SOFT_STATUS_QUERY_LATE`, `SOFT_LANGUAGE_NO_ATTEMPT`, `SOFT_STACK_REASON_THIN`, `SOFT_MAP_OVERTRUST`, `SOFT_CALLBACK_NOT_LOGGED`, `SOFT_BOLO_INCOMPLETE`, `SOFT_TIMER_WARNING_IGNORED`, `SOFT_CONCURRENCY_TUNNEL`

---

### M02c — Evaluation form structure (debrief)

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/RUBRIC.md` §DebriefForm · `packages/core/src/grade/debrief.ts` · UI debrief M07 |
| **Owner agent** | RUBRIC-DEBRIEF |
| **Numeric floor** | Form sections ≥ **10** domains matching volley rubric domains; pass bar documented; disclaimer string fixed |
| **Acceptance** | Debrief JSON schema validates; UI renders form not confetti; headless debrief hash stable for golden SessionRecords |
| **Link** | Kill confetti; R14 |

**Debrief sections:** LOC, PRI, ASN, STA, RAD, TIM, DOC, SAF, MUL, CON + summary pass/fail + remediation tags + timeline scrub indices + metrics + disclaimer

---

## M03 — Complete Zod schemas (domain spine)

Every schema agent produces: Zod object, exported TypeScript type, field-level JSDoc in `docs/SCHEMA.md`, JSON Schema emit under `packages/core/schema/`.

### M03a — `IncidentTruth` (hidden)

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/incidentTruth.ts` · docs |
| **Owner agent** | SCHEMA-TRUTH |
| **Numeric floor** | ≥ **12** fields including actualLocation, actualPriority, actualNature, weapons, inProgress, requiresBackup, callerLanguage, knowableSchedule optional, notes |
| **Acceptance** | Never serialized into player snapshot by default; `getSnapshot({includeTruth:false})`; tests assert truth absent from UI projection |
| **Link** | C10; information-set |

### M03b — CFS / Incident

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/incident.ts` |
| **Owner agent** | SCHEMA-CFS |
| **Numeric floor** | All liability timestamps; priorityHistory; flags closed enum; notes array; disposition nullable; assignment fields |
| **Acceptance** | Zod parse fixtures; invariant: cleared ⇒ disposition non-null in post-condition check |

### M03c — Unit

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/unit.ts` |
| **Owner agent** | SCHEMA-UNIT |
| **Numeric floor** | id, callsign, agencyId, type, status, statusChangedAtMs, location, capabilities[], assignedIncidentId, zoneId, lastKnownAtMs |
| **Acceptance** | Status ∈ pack graph |

### M03d — RadioEvent

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/radioEvent.ts` |
| **Owner agent** | SCHEMA-RADIO |
| **Numeric floor** | caption **required**; talkgroup/channel; direction; kind; requiresReadback; readbackSatisfiedAtMs; stepOn; incomplete; structured slots; link cfs/unit |
| **Acceptance** | Caption empty string fails Zod |

### M03e — GradeEvent

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/gradeEvent.ts` |
| **Owner agent** | SCHEMA-GRADE |
| **Numeric floor** | id, atMs, severity, code, rubricId, message, evidence{expected,actual,ruleRef,commandId?} |
| **Acceptance** | code ∈ FAIL_/SOFT_ union |

### M03f — SessionRecord

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/sessionRecord.ts` |
| **Owner agent** | SCHEMA-SESSION |
| **Numeric floor** | schemaVersion, scenarioId, packId, packVersion, seed, commands[{atMs, cmd}], engineVersion |
| **Acceptance** | Sacred invariant tests use this type exclusively |

### M03g — Scenario

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/scenario.ts` · `docs/SCENARIO_FORMAT.md` updated to full |
| **Owner agent** | SCHEMA-SCENARIO |
| **Numeric floor** | kind checkride|watch|academy; seed; packId; units; incidents; timeline injects; passConditions; adversarialTags; contentNotes; expectedHardFails optional for fail fixtures |
| **Acceptance** | Both Phase 0 scenarios parse |

### M03h — PlayerCommand (closed set)

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/schema/playerCommand.ts` · `docs/PLAYER_COMMANDS.md` |
| **Owner agent** | SCHEMA-CMD |
| **Numeric floor** | Exhaustive discriminated union; **every** variant listed with fields; no open `string` command type |
| **Acceptance** | Reducer switch exhaustive (`never` check); unknown command rejected at parse |

**Phase 0 closed PlayerCommand set (complete list — no others):**

1. `VerifyLocation`  
2. `SetPriority`  
3. `SetNature`  
4. `AddNote`  
5. `SetFlag`  
6. `DispatchUnits`  
7. `AddUnitToIncident`  
8. `ReleaseUnit`  
9. `SetUnitStatus`  
10. `RadioTx` (templateId + slots)  
11. `RadioTxFreeform` (caption + kind — still structured grade after parse)  
12. `AckReadback`  
13. `UnitRadioRx` (scenario/NPC)  
14. `ClearIncident`  
15. `CancelIncident`  
16. `HoldIncident`  
17. `RequestStatusCheck`  
18. `Advance`  
19. `InjectIncident` (scenario runtime / debug)  
20. `InjectRadio` (step-on, incomplete)  
21. `SetChannelEmergency`  
22. `LinkDuplicate`  
23. `NoOp`  

---

## M04 — Checkride scenario (C1 + C2 + C5 minimum)

| Field | Contract |
|-------|----------|
| **Artifact** | `scenarios/checkride_a07_ocean_robbery_v1/scenario.json` · `scenarios/checkride_a07_ocean_robbery_v1/session_fail.json` · `scenarios/checkride_a07_ocean_robbery_v1/session_pass.json` · `scenarios/checkride_a07_ocean_robbery_v1/EXPECTED.md` · golden tests |
| **Owner agent** | SCENARIO-CHECKRIDE |
| **Numeric floor** | Encodes **C1, C2, C5** fully; also exercises C4 backup; inject timeline ≥ **12** timed events; EXPECTED.md lists exact hard fail codes for fail SessionRecord; pass SessionRecord has **zero** hard fails |
| **Acceptance** | `npm run sim:checkride:fail` and `:pass`; Vitest asserts code multisets; double replay identical |
| **Link** | Phase 0 exit; sacred invariant |

### M04 narrative (binding)

**Title:** A07 Ocean corridor — robbery with bad initial address  
**Seed:** 305001  
**Pack:** miami-a07-police-v0  
**Console:** A07 · SE305-PRI  

**Initial CFS-001 (knowable at t=0):**

- Nature presented as DISTURBANCE / loud argument (P3)  
- Location freeform: “by the neon club on the beach” — `unverified`  
- Caller language EN, frantic note from NPC call-taker  
- **Truth:** ROBBERY-IP, P1, weapons true, 1400 block Ocean Drive, Z-OCEAN, requiresBackup  

**Inject timeline (minimum):**

| tMs | Inject | Knowable effect |
|-----|--------|-----------------|
| 0 | CFS-001 pending | C1 pressure starts |
| 15000 | CT note: “caller says someone took a bag, maybe a knife” | C2 cue — weapons/robbery knowable |
| 25000 | CT correction: “1400 Ocean Drive he thinks” | Location partial available |
| 35000 | Optional step-on on unit chatter | incomplete RX |
| 45000 | If still no dispatch P1 path, aging path available | TIM |
| 60000 | Readback window interactions depend on player | C5 |

**Fail SessionRecord (must produce at minimum these hard codes):**

- `FAIL_NO_VERIFY` (C1)  
- `FAIL_PRIORITY_UNDERCODE` (C2 — dispatch or leave at low priority after knife/bag cue)  
- `FAIL_NO_READBACK` (C5)  
- `FAIL_NO_BACKUP` (C4 companion — single unit)  
- `FAIL_SAFETY_NOT_AIRED` if weapons knowable and radio omits  

**Pass SessionRecord (must):**

- Verify to partial or verified 1400 Ocean before or as part of legal P1 path  
- Reclass nature ROBBERY-IP + P1 after cue  
- Dispatch ≥2 units with weapons in radio caption  
- Obtain readbacks within window  
- Progress statuses legally  
- Clear with disposition; no hard fails  

**EXPECTED.md must list:** full command stream commentary, exact grade code multiset for fail, exact empty hard list for pass, seed, pack version.

---

## M05 — Busy-watch scenario (single sector concurrency)

| Field | Contract |
|-------|----------|
| **Artifact** | `scenarios/watch_a07_friday_night_v1/scenario.json` · `session_reference.json` · `EXPECTED.md` · tests |
| **Owner agent** | SCENARIO-WATCH |
| **Numeric floor** | Duration ≥ **15 simulated minutes**; ≥ **8** CFS injected; ≥ **3** concurrent open at peak; mix P1–P4; ≥1 language delay inject (C8 hook); ≥1 jurisdiction edge (C7 hook); no multi-sector map |
| **Acceptance** | Headless advance completes; reference play has documented soft/hard expectations; concurrency can trigger `FAIL_CHANNEL_ABANDON` or `FAIL_PRIORITY_AGING` on bad play SessionRecord |
| **Link** | Phase 0 busy watch; C6 |

**Sector only:** SE305-A07 zones Z-OCEAN, Z-COLLINS, Z-DOWNTOWN, Z-WYNWOOD, Z-PORT (port = handoff flag, still one console sector board).

**Unit table floor:** ≥ **10** units in sector for poverty/triage realism.

---

## M06 — Text-radio command set + template engine

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/radio/*` · `docs/PLAYER_COMMANDS.md` · UI radio panel bindings · tests |
| **Owner agent** | RADIO-ENGINE |
| **Numeric floor** | All 12 templates from M01c implemented; slot validation; freeform parser extracts unit/priority/nature/location/safety with documented regex+lexicon; **no STT module required** |
| **Acceptance** | Keyboard-only checkride pass; mic APIs absent from Phase 0 UI; captions always on RadioEvent |
| **Link** | Speech is a view; Phase 0 text |

**UI radio modes (both required):**

1. Template form (dropdown template → slot fields → TX)  
2. Command line freeform → parse → confirm slots → TX  

---

## M07 — A-console glass surfaces (BRIEF-complete)

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/web/src/**` · `docs/UI_CONTRACT.md` · CSS EFIS tokens · shell route |
| **Owner agent** | UI-GLASS (+ UI-SHELL sub-agent) |
| **Numeric floor** | **6** glass surfaces + shell + debrief; keyboard focus order documented; no neon on glass |
| **Acceptance** | Playwright or manual script checklist in `docs/UI_ACCEPTANCE.md` with 20 steps; location confidence enforced on map; timers visible |
| **Link** | BRIEF Phase 0 surfaces; shell≠glass |

**Surfaces (each is a sub-deliverable):**

| ID | Surface | Requirements |
|----|---------|--------------|
| M07a | Incident queue | Sort by priority then age; show P-code, CFS#, nature, loc confidence, status, age timer |
| M07b | Unit status board | All units; status color EFIS; assignment; not assignable greyed |
| M07c | Radio log/panel | Scrollback; TX template+CLI; readback warnings; emergency banner |
| M07d | Incident form | Priority, nature, location, flags, notes append, disposition on clear |
| M07e | Timers | Queue age, SLA countdown, readback countdown, ER/OS overdue |
| M07f | Imperfect map | Zone polygons; confidence rules M01e; no truth pins; last-known units only |
| M07g | Shell | South Beach swag login / OPEN WATCH only |
| M07h | Debrief | Evaluation form M02c; timeline; hard/soft lists; disclaimer |

**EFIS tokens (locked):** `--void`, `--panel`, `--cyan-data`, `--green-engaged`, `--amber-caution`, `--red-bad`, `--text`, `--muted`, `--hairline`. Neon only on shell.

---

## M08 — Deterministic replay + debrief pipeline

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/runtime/*` · `packages/core/src/replay/*` · `packages/core/src/grade/*` · CLI `sim` · tests `sacred_invariant.test.ts` |
| **Owner agent** | FORGE-REPLAY |
| **Numeric floor** | Pure sim clock; seeded PRNG; SessionRecord round-trip; debrief builder; **hard fail multiset equality** helper |
| **Acceptance** | `sacred_invariant.test.ts`: for fail and pass SessionRecords, replay twice → identical hard code multisets and identical soft code multisets; cross-run stable on CI |
| **Link** | Sacred invariant |

**Also required:**

- `engineVersion` string in SessionRecord  
- No `Date.now()` in reducers  
- No randomness outside seeded RNG  
- UI grade view == headless debrief for same record  

---

## M09 — Pack structure miami-a07-police-v0

| Field | Contract |
|-------|----------|
| **Artifact** | `packs/miami-a07-police-v0/**` (split JSON files) · `pack.json` manifest · loader · validate CLI |
| **Owner agent** | PACK-MIAMI |
| **Numeric floor** | Separate files: priorities, unit_statuses (64-cell matrix), natures (≥12), dispositions (≥9), radio_templates (≥12), assignment, location_confidence, cfs_lifecycle, rubric, rubric_soft, zones (≥5), strings/en.json, disclaimer |
| **Acceptance** | `npm run validate:packs` parses all; **zero** `if (packId === 'miami')` or zone name branches in `packages/core` (grep gate in CI) |
| **Link** | Data-driven doctrine; FORGE |

**Natures floor (≥12 codes):** ROBBERY-IP, ASSAULT-IP, WEAPONS, DOMESTIC, DISTURBANCE, THEFT-REPORT, WELFARE, 911-OPEN, BURG-IP, SHOTS-HEARD, TRAFFIC-CRASH, SUSP-PERSON, OFFICER-EMERGENCY, ALARM  

---

## M10 — Test / golden strategy

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/tests/**` · `tests/goldens/**` · CI workflow |
| **Owner agent** | QA-GOLDEN |
| **Numeric floor** | See table below |
| **Acceptance** | `npm test` green; CI on PR; coverage gates listed |
| **Link** | Exit gate evidence |

| Suite | Min tests | Must assert |
|-------|-----------|-------------|
| `unit_status_matrix.test.ts` | 64 cells + walks | illegal blocked |
| `priority.test.ts` | ≥20 | reclass, undercode, aging |
| `location.test.ts` | ≥12 | verify gates |
| `assignment.test.ts` | ≥15 | backup, type, OOS |
| `radio_protocol.test.ts` | ≥20 | templates, readback, emergency, step-on |
| `cfs_lifecycle.test.ts` | ≥15 | transitions, disposition, notes |
| `checkride_sacred.test.ts` | ≥4 | fail multiset, pass empty hard, double replay ×2 |
| `watch_headless.test.ts` | ≥2 | completes; bad play ages |
| `pack_validate.test.ts` | ≥1 | pack loads |
| `grep_no_miami_if.test.ts` | ≥1 | no hardcoded miami branches |

**Golden files:** store SessionRecords + expected hard code arrays as JSON fixtures committed to git.

---

# PART B — EXTENDED MACHINE-CHECKABLE DEPTH (required expansions)

## M11 — Information-set / knowable schedule engine

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/doctrine/infoSet.ts` · scenario `knowableSchedule` · tests |
| **Owner agent** | DOCTRINE-INFOSET |
| **Numeric floor** | Cues typed: location_hint, weapons_cue, nature_cue, language_barrier, unit_sizeup; each has `becomesKnowableAtMs` |
| **Acceptance** | Undercode hard fail only after cue knowable; C10 fixture: no fail when cue never delivered |
| **Link** | C10; R3 |

## M12 — Timer service (SOP timers)

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/runtime/timers.ts` · UI timers |
| **Owner agent** | FORGE-TIMERS |
| **Numeric floor** | Dispatch SLA, readback, ER overdue, OS overdue, status refresh, hold expiration — all pack-configured |
| **Acceptance** | Each timer type has ≥1 test firing a grade or system note |
| **Link** | R10 |

## M13 — NPC call-taker inject model (player is not everyone)

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/runtime/callTakerNpc.ts` · scenario CT scripts |
| **Owner agent** | DOCTRINE-CTSIDE |
| **Numeric floor** | CT can deliver late/wrong/partial notes; player cannot edit CT identity; ≥5 CT inject types |
| **Acceptance** | Checkride uses CT injects for C1/C2 cues; role separation documented |
| **Link** | R1 |

## M14 — Content policy + disclaimer enforcement

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/CONTENT_POLICY.md` · scenario `contentNotes` required · debrief disclaimer constant test |
| **Owner agent** | POLICY |
| **Numeric floor** | All scenarios have contentNotes; banned claim strings grep in repo (`APCO certified`, `NENA approved`, real agency endorsement) |
| **Acceptance** | CI grep fails on forbidden credential phrases in UI copy |
| **Link** | Licensed content law; ARENA honesty |

## M15 — CLI surface

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/src/cli/sim.ts` · package.json scripts |
| **Owner agent** | FORGE-CLI |
| **Numeric floor** | Commands: `sim checkride fail|pass`, `sim watch`, `sim replay <session.json>`, `validate:packs`, `emit:jsonschema` |
| **Acceptance** | Each command exit 0 on success; fail demo exit 0 with printed hard fails; pass demo exit 1 if hard fails appear |
| **Link** | Instructor/headless |

## M16 — UI acceptance script + a11y floor

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/UI_ACCEPTANCE.md` · optional Playwright |
| **Owner agent** | UI-A11Y |
| **Numeric floor** | 20-step manual script; keyboard path for full checkride; captions/text always; contrast tokens documented |
| **Acceptance** | Script completed once and checked into docs as signed checklist template |
| **Link** | Accessibility moat |

## M17 — Kill-list CI guards

| Field | Contract |
|-------|----------|
| **Artifact** | `packages/core/tests/kill_list_guards.test.ts` · docs/KILL_LIST.md |
| **Owner agent** | ARENA-KILLS |
| **Numeric floor** | Document all kill-list items; automated guards where possible (no confetti CSS class, no STT import in web, no score chase points API) |
| **Acceptance** | Guards green |
| **Link** | Kill list absolute |

## M18 — Session export/import (glass)

| Field | Contract |
|-------|----------|
| **Artifact** | UI button export SessionRecord JSON; load replay |
| **Owner agent** | UI-REPLAY |
| **Numeric floor** | Export fail and pass sessions from UI; reload produces same debrief hard multiset |
| **Acceptance** | Documented in UI_ACCEPTANCE |
| **Link** | Sacred invariant user-visible |

## M19 — Documentation spine (Phase 0 complete set)

| Field | Contract |
|-------|----------|
| **Artifact** | Listed below — all present and non-stub |
| **Owner agent** | DOCS-INTEGRATOR |
| **Numeric floor** | All files &gt; defined min sections |
| **Acceptance** | README links all; no file says “todo” |

**Required docs at Phase 0 close:**

1. `docs/PHASE0_SCOPE_MANIFEST.md` (this file)  
2. `docs/BRIEF.md`  
3. `docs/ADVERSARIAL_VOLLEY.md`  
4. `docs/ARCHITECTURE.md`  
5. `docs/DOCTRINE.md` (full tables)  
6. `docs/RUBRIC.md` (full codes)  
7. `docs/SCHEMA.md`  
8. `docs/PLAYER_COMMANDS.md`  
9. `docs/SCENARIO_FORMAT.md`  
10. `docs/UI_CONTRACT.md`  
11. `docs/UI_ACCEPTANCE.md`  
12. `docs/CONTENT_POLICY.md`  
13. `docs/KILL_LIST.md`  
14. `docs/COVERAGE_TABLE.md` (exit gate — filled at close)  
15. `CLAUDE.md`  
16. `README.md`  

## M20 — Critic loop harness

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/CRITIC_ROUNDS.md` log · process |
| **Owner agent** | ORCHESTRATOR (human+model) |
| **Numeric floor** | ≥2 consecutive full critic rounds (DOCTRINE, FORGE, ARENA, ANTI-EFFICIENCY) with **zero findings** each before Phase 0 declared closed |
| **Acceptance** | CRITIC_ROUNDS.md shows Round N and N+1 empty findings after fixes |
| **Link** | Contract completeness loop |

## M21 — Nature × priority × backup matrix

| Field | Contract |
|-------|----------|
| **Artifact** | `packs/miami-a07-police-v0/nature_matrix.json` · tests |
| **Owner agent** | DOCTRINE-NATURES |
| **Numeric floor** | ≥12 natures × default priority × backup bool × weaponsLikely × inProgressDefault × radio safety required |
| **Acceptance** | Every nature has complete row; assignment tests sample each backup=true nature |
| **Link** | R8; R9 |

## M22 — Adversarial challenge coverage matrix (C1–C10)

| Field | Contract |
|-------|----------|
| **Artifact** | `docs/CHALLENGE_COVERAGE.md` · fixtures |
| **Owner agent** | ARENA-C-COVERAGE |
| **Numeric floor** | C1,C2,C5 **fully** in checkride; C3,C4,C6 **fully** in tests or watch; C7,C8,C9,C10 **hooked** with at least one automated test each in Phase 0 |
| **Acceptance** | Coverage table rows all “automated evidence” links |
| **Link** | Volley challenges |

---

# PART C — AGENT FAN-OUT ROSTER (minimum)

| Agent ID | Manifest IDs | Acceptance handoff |
|----------|--------------|--------------------|
| DOCTRINE-PRIORITY | M01a | priorities.json + tests |
| DOCTRINE-STATUS | M01b | 64-cell matrix + tests |
| DOCTRINE-RADIO | M01c | templates + protocol tests |
| DOCTRINE-CFS | M01d | lifecycle + notes tests |
| DOCTRINE-LOCATION | M01e | confidence + map rules |
| DOCTRINE-ASSIGN | M01f | assignment tests |
| DOCTRINE-INFOSET | M11 | C10 tests |
| DOCTRINE-CTSIDE | M13 | CT injects |
| DOCTRINE-NATURES | M21 | nature matrix |
| RUBRIC-HARD | M02a | ≥24 hard codes wired |
| RUBRIC-SOFT | M02b | ≥15 soft codes |
| RUBRIC-DEBRIEF | M02c | debrief schema |
| SCHEMA-TRUTH | M03a | |
| SCHEMA-CFS | M03b | |
| SCHEMA-UNIT | M03c | |
| SCHEMA-RADIO | M03d | |
| SCHEMA-GRADE | M03e | |
| SCHEMA-SESSION | M03f | |
| SCHEMA-SCENARIO | M03g | |
| SCHEMA-CMD | M03h | closed union |
| SCENARIO-CHECKRIDE | M04 | fail/pass sessions |
| SCENARIO-WATCH | M05 | busy watch |
| RADIO-ENGINE | M06 | template engine |
| UI-GLASS | M07a–f | surfaces |
| UI-SHELL | M07g | shell |
| UI-DEBRIEF | M07h | form |
| UI-REPLAY | M18 | export/import |
| UI-A11Y | M16 | acceptance doc |
| FORGE-REPLAY | M08 | sacred invariant |
| FORGE-TIMERS | M12 | timer tests |
| FORGE-CLI | M15 | CLI |
| PACK-MIAMI | M09 | pack split |
| QA-GOLDEN | M10 | all suites |
| POLICY | M14 | policy + grep |
| ARENA-KILLS | M17 | kill list guards |
| ARENA-C-COVERAGE | M22 | challenge matrix |
| DOCS-INTEGRATOR | M19 | docs spine |
| CRITIC-DOCTRINE | M20 | findings only |
| CRITIC-FORGE | M20 | findings only |
| CRITIC-ARENA | M20 | findings only |
| CRITIC-ANTI-EFFICIENCY | M20 | findings only |
| ORCHESTRATOR | integrate + coverage table | |

**Count:** ≥ **40** dedicated agent roles. Merging is a contract violation.

---

# PART D — BUILD SEQUENCE (after human approve only)

1. Human approves this manifest (or amends in writing).  
2. Fan-out schema agents M03* + pack M09 skeleton (parallel).  
3. Fan-out doctrine M01* + rubric M02* (parallel).  
4. Runtime/replay M08 + timers M12 + infoSet M11.  
5. Radio engine M06.  
6. Scenarios M04 + M05.  
7. Goldens M10 continuously as each module lands.  
8. UI M07* after core green for checkride headless.  
9. Guards M14 M17 M22.  
10. Critic round 1 → fix all → critic round 2 → fix all → until two consecutive zero-finding rounds.  
11. Fill `docs/COVERAGE_TABLE.md` exit gate.  

**Do not start step 2 until step 1 is human-approved.**

---

# PART E — EXIT GATE TEMPLATE (`docs/COVERAGE_TABLE.md` at close)

Every row must be filled with artifact paths + evidence. Empty cell = not done.

| Manifest ID | Artifact(s) | Evidence of completeness |
|-------------|-------------|--------------------------|
| M01a | | e.g. 6 priorities; N reclass tests |
| M01b | | 8 states; 64 cells; tests |
| M01c | | 12 templates; readback/emergency/step-on tests |
| M01d | | lifecycle matrix; disposition tests |
| M01e | | 4 confidence levels; map rules; FAIL_NO_VERIFY |
| M01f | | assignment scores; backup tests |
| M02a | | hard code count; C1–C10 map |
| M02b | | soft code count |
| M02c | | debrief schema |
| M03a–h | | schema files + jsonschema emit |
| M04 | | SessionRecord fail codes list; double replay |
| M05 | | watch CFS count; concurrency peak |
| M06 | | keyboard-only pass |
| M07a–h | | UI_ACCEPTANCE checked |
| M08 | | sacred_invariant.test.ts green |
| M09 | | validate:packs; no miami if |
| M10 | | test counts |
| M11–M22 | | per acceptance |

**Sacred invariant evidence block (mandatory quote in coverage table):**

```
session_fail.json ×2 replays → hardCodes multiset A
session_pass.json ×2 replays → hardCodes multiset empty
A includes FAIL_NO_VERIFY, FAIL_PRIORITY_UNDERCODE, FAIL_NO_READBACK
```

---

# PART F — HUMAN CHECKPOINT

## What you are approving

This document as the **sole Phase 0 definition of done**. Anything not listed cannot be required later without a written amend. Anything listed cannot be dropped without a written amend.

## Known tension (disclosed)

A thin seed already exists in-repo. **It does not satisfy this manifest.** Approval means we will thicken or replace until every row passes — not ship the seed as Phase 0.

## Amend protocol

Reply with:

1. **APPROVE AS WRITTEN** — begin fan-out immediately  
2. **APPROVE WITH AMENDS** — list ID-level changes  
3. **REJECT** — state constitutional conflict  

---

## Manifest self-adversarial note (Anti-Efficiency)

If this document feels “long enough,” it is still under-specified until every numeric floor has a corresponding test name and file path after build. The post-build critic rounds exist to punish premature celebration. Phase 0 is closed only by **two consecutive zero-finding critic rounds** plus a complete coverage table — not by vibes, not by demo screenshots alone.

**Pause here for human review. No build fan-out until approval.**
