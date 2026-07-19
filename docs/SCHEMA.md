# SECTOR 305 — Domain schema (Phase 0)

**Package:** `@sector305/core`  
**Source:** `packages/core/src/schema/*.ts`  
**Grade codes:** `packages/core/src/grade/codes.ts`  
**Validation:** Zod 3, `.strict()` on domain objects and commands (unknown keys rejected).

This document is the field-level contract for the domain spine. Types are inferred from Zod; `packages/core/src/types.ts` re-exports them for Runtime compatibility.

---

## Conventions

| Convention | Rule |
|------------|------|
| Clock | All `*AtMs` / `atMs` are **sim-clock** milliseconds from scenario start — never `Date.now()` |
| IDs | Opaque strings; stable within a SessionRecord |
| Truth | `Incident.truth` is grader/scenario-only; strip for player snapshots |
| Caption | Every `RadioEvent.caption` is non-empty |
| Commands | Closed set of **23** `PlayerCommand` variants — see [PLAYER_COMMANDS.md](./PLAYER_COMMANDS.md) |
| Grades | `GradeEvent.code` ∈ `FAIL_*` ∪ `SOFT_*` closed unions |

---

## Enums (common)

### `PriorityCode`
`P0` | `P1` | `P2` | `P3` | `P4` | `P5`

### `UnitStatus`
| Code | Meaning |
|------|---------|
| `AVL` | Available |
| `DIS` | Dispatched |
| `ER` | En route |
| `OS` | On scene |
| `CLR` | Clearing |
| `OOS` | Out of service |
| `BSI` | Busy self-initiated |
| `EMR` | Unit emergency |

### `IncidentStatus`
`PENDING` | `DISPATCHED` | `WORKING` | `HOLD` | `CLEARED` | `CANCELLED` | `LINKED_DUP`

### `LocationConfidence`
`unverified` | `partial` | `verified` | `conflicting`

### `GradeSeverity`
`hard_fail` | `soft` | `note`

### `CallerLanguage`
`en` | `es` | `ht` | `unknown`

### `UnitType`
`patrol` | `supervisor` | `traffic` | `k9`

### `IncidentFlag` (closed)
`WEAPONS` · `NEEDS_BACKUP` · `IN_PROGRESS` · `DOMESTIC` · `SUPERVISOR_REQ` · `BOLO` · `LANGUAGE_ES` · `LANGUAGE_HT` · `SAFETY_HAZARD` · `MENTAL_HEALTH` · `TRAFFIC_HAZARD` · `FIRE_EMS_NEEDED` · `DUPLICATE` · `HOLD_ACTIVE`

### `RadioKind`
`DISPATCH` | `ACK` | `STATUS` | `UPDATE` | `EMERGENCY` | `BOLO` | `QUERY` | `SYSTEM`

### `RadioDirection`
`dispatch_tx` | `unit_tx` | `system`

### `RadioTemplateId`
`DISPATCH_ASSIGN` · `DISPATCH_ADD_UNIT` · `DISPATCH_CANCEL` · `DISPATCH_REASSIGN` · `STATUS_QUERY` · `STATUS_CORRECTION` · `READBACK_PROMPT` · `EMERGENCY_TRAFFIC_OPEN` · `EMERGENCY_TRAFFIC_CLEAR` · `BOLO` · `WELFARE_CHECK_DISPATCH` · `GENERAL_BROADCAST`

### `RadioSlotName`
`to_units` · `from_console` · `priority` · `nature` · `location` · `cross_street` · `safety` · `cfs_number` · `status` · `direction` · `description` · `reason` · `channel`

### `ScenarioKind`
`checkride` | `watch` | `academy`

---

## `LocationRef`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `freeform` | string | yes | Display / radio location text |
| `block` | string | no | Block number |
| `street` | string | no | Street name |
| `crossStreet` | string | no | Cross street |
| `zoneId` | string | yes | Sector zone (map / assign) |
| `city` | string | no | City label |
| `lat` | number | no | Optional coords (imperfect map) |
| `lon` | number | no | Optional coords |

---

## `CadNote`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `atMs` | number ≥ 0 | yes | Append time |
| `author` | `player` \| `system` \| `unit` \| `call_taker` | yes | Provenance |
| `text` | string ≥ 1 | yes | Append-only; no edit/delete API |

---

## `PriorityHistoryEntry`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `atMs` | number ≥ 0 | yes | When priority changed |
| `from` | PriorityCode | yes | Prior code |
| `to` | PriorityCode | yes | New code |
| `reason` | string | no | Downgrade / reclass reason |
| `author` | NoteAuthor | yes | Who changed it |

---

## `TruthKnowableCue`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `atMs` | number ≥ 0 | yes | When facet becomes knowable |
| `facet` | enum | yes | `location` \| `priority` \| `nature` \| `weapons` \| `inProgress` \| `requiresBackup` \| `callerLanguage` \| `note` |
| `summary` | string ≥ 1 | yes | Designer / grader description |

Distinct from runtime `doctrine/infoSet.KnowableCue` (inject schedule objects).

---

## `IncidentTruth` (hidden)

Schema: `packages/core/src/schema/incidentTruth.ts`

Never serialized into default player snapshot. Drives honesty + information-set fairness (C10).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `actualLocation` | LocationRef | yes | Ground-truth place |
| `actualPriority` | PriorityCode | yes | Intended acuity |
| `actualNature` | string | yes | Pack nature code |
| `weapons` | boolean | yes | Threat/weapons truth |
| `inProgress` | boolean | yes | Still active |
| `requiresBackup` | boolean | yes | Multi-unit truth |
| `callerLanguage` | CallerLanguage | yes | Actual caller language |
| `notes` | string | no | Author notes (not CAD) |
| `knowableSchedule` | TruthKnowableCue[] | no | When facets enter player knowable set |
| `subjectDescription` | string | no | BOLO / subject text |
| `secondaryLocation` | LocationRef | no | Last-seen etc. |
| `actualJurisdictionId` | string | no | Handoff jurisdiction |

**Floor:** ≥ 12 fields (12 listed).

---

## `Incident` (CFS)

Schema: `packages/core/src/schema/incident.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable CFS id |
| `cfsNumber` | string | yes | Display number |
| `priority` | PriorityCode | yes | Current set priority |
| `natureCode` | string | yes | Pack nature code |
| `natureText` | string | yes | Plain-language nature |
| `location` | LocationRef | yes | Player belief / CAD location |
| `locationConfidence` | LocationConfidence | yes | Verify state |
| `jurisdictionId` | string | yes | Agency/jurisdiction |
| `status` | IncidentStatus | yes | CFS lifecycle |
| `createdAtMs` | number ≥ 0 | yes | Authoring create |
| `receivedAtMs` | number ≥ 0 | yes | Liability: received |
| `enteredAtMs` | number \| null | yes | Liability: CAD entered |
| `priorityHistory` | PriorityHistoryEntry[] | yes | Liability: reclass log |
| `firstDispatchAtMs` | number \| null | yes | Liability: first DIS |
| `firstEnRouteAtMs` | number \| null | yes | Liability: first ER |
| `firstOnSceneAtMs` | number \| null | yes | Liability: first OS |
| `lastUpdateAtMs` | number \| null | yes | Liability: last material update |
| `clearedAtMs` | number \| null | yes | Liability: clear/cancel |
| `assignedUnitIds` | string[] | yes | Current units |
| `primaryUnitId` | string \| null | yes | Primary unit |
| `callerLanguage` | CallerLanguage | yes | CAD language field |
| `flags` | IncidentFlag[] | yes | Closed flag set |
| `notes` | CadNote[] | yes | Append-only narrative |
| `disposition` | string \| null | yes | Required when CLEARED (post-condition) |
| `linkedIncidentId` | string \| null | no | When `LINKED_DUP` |
| `truth` | IncidentTruth | yes | Hidden |

**Invariant:** `status === "CLEARED"` ⇒ `disposition` non-null (enforced at clear edge + `assertClearedHasDisposition`).

---

## `Unit`

Schema: `packages/core/src/schema/unit.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable unit id |
| `callsign` | string | yes | Radio callsign |
| `agencyId` | string | yes | Agency |
| `type` | UnitType | yes | Resource type |
| `status` | UnitStatus | yes | Must follow pack graph |
| `statusChangedAtMs` | number ≥ 0 | yes | Last status edge time |
| `location` | LocationRef | yes | **Last-known only** |
| `capabilities` | string[] | yes | e.g. supervisor |
| `assignedIncidentId` | string \| null | yes | Current CFS |
| `zoneId` | string | yes | Home / last zone |
| `lastKnownAtMs` | number ≥ 0 | yes | Map lag sample time |

---

## `RadioEvent`

Schema: `packages/core/src/schema/radioEvent.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable event id |
| `atMs` | number ≥ 0 | yes | Log time |
| `channelId` | string | yes | Talkgroup (e.g. SE305-PRI) |
| `direction` | RadioDirection | yes | Who TX |
| `from` | string | yes | Source callsign/console |
| `to` | string \| null | yes | Target |
| `kind` | RadioKind | yes | Message class |
| `caption` | string ≥ 1 | yes | **Never empty** — speech is a view over this |
| `incidentId` | string | no | Linked CFS |
| `unitId` | string | no | Linked unit |
| `requiresReadback` | boolean | yes | P0/P1 dispatch path |
| `readbackSatisfiedAtMs` | number \| null | yes | When ACK satisfied |
| `steppedOn` | boolean | yes | Step-on content flag |
| `incomplete` | boolean | yes | Squelch/cut incomplete |
| `templateId` | RadioTemplateId | no | Template that produced event |
| `structured` | Record | no | Slots / freeform bag |

---

## `GradeEvent`

Schema: `packages/core/src/schema/gradeEvent.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable id |
| `atMs` | number ≥ 0 | yes | When graded |
| `severity` | GradeSeverity | yes | hard_fail / soft / note |
| `code` | GradeCode | yes | Closed FAIL_/SOFT_ union |
| `rubricId` | string | yes | Rubric row id |
| `incidentId` | string | no | Linked CFS |
| `unitId` | string | no | Linked unit |
| `message` | string ≥ 1 | yes | Human debrief line |
| `evidence.expected` | string | no | Expected value |
| `evidence.actual` | string | no | Actual value |
| `evidence.ruleRef` | string | yes | Doctrine/rule pointer |
| `evidence.commandId` | string | no | Causing command / sim event |

### Hard codes (`FAIL_*`) — 24

`FAIL_NO_VERIFY` · `FAIL_WRONG_LOCATION` · `FAIL_PRIORITY_UNDERCODE` · `FAIL_PRIORITY_AGING` · `FAIL_HOLD_HIGH_PRIORITY` · `FAIL_NO_BACKUP` · `FAIL_UNIT_NOT_ASSIGNABLE` · `FAIL_UNIT_WRONG_TYPE` · `FAIL_STATUS_ILLEGAL` · `FAIL_STATUS_DIRTY_CLOSE` · `FAIL_STATUS_STALE` · `FAIL_NO_READBACK` · `FAIL_RADIO_FORMAT` · `FAIL_RADIO_EMERGENCY_TRAFFIC` · `FAIL_SAFETY_NOT_AIRED` · `FAIL_NO_DISPOSITION` · `FAIL_NARRATIVE_MISSING_CRITICAL` · `FAIL_JURISDICTION` · `FAIL_DIVERT_WITHOUT_LOG` · `FAIL_CHANNEL_ABANDON` · `FAIL_INFOSET_VIOLATION` · `FAIL_READBACK_WRONG` · `FAIL_RECLASS_NO_RADIO` · `FAIL_DOUBLE_ASSIGN_CONFLICT`

### Soft codes (`SOFT_*`) — 15

`SOFT_PRIORITY_LOW` · `SOFT_RADIO_FORMAT` · `SOFT_RADIO_WORDY` · `SOFT_SLOW_KEY` · `SOFT_DOWNGRADE_WHILE_ROLLING` · `SOFT_NOTE_THIN` · `SOFT_UNIT_SUBOPTIMAL_TYPE` · `SOFT_STATUS_QUERY_LATE` · `SOFT_LANGUAGE_NO_ATTEMPT` · `SOFT_STACK_REASON_THIN` · `SOFT_MAP_OVERTRUST` · `SOFT_CALLBACK_NOT_LOGGED` · `SOFT_BOLO_INCOMPLETE` · `SOFT_TIMER_WARNING_IGNORED` · `SOFT_CONCURRENCY_TUNNEL`

---

## `SessionRecord`

Schema: `packages/core/src/schema/sessionRecord.ts`

Sacred replay artifact. State is **re-derived** by applying `commands` to seed + pack + base fixtures.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schemaVersion` | `1` | yes | Record format version |
| `scenarioId` | string | yes | Scenario id |
| `packId` | string | yes | Doctrine pack |
| `packVersion` | string | yes | Pack version string |
| `seed` | int | yes | Seeded PRNG |
| `engineVersion` | string | yes | Engine build (default `0.1.0`) |
| `commands` | `{ atMs, cmd }[]` | yes | Ordered stream; `cmd` is PlayerCommand |

---

## `Scenario`

Schema: `packages/core/src/schema/scenario.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Scenario id |
| `version` | string | yes | Authoring version |
| `kind` | ScenarioKind | yes | checkride / watch / academy |
| `packId` | string | yes | Pack binding |
| `seed` | int | yes | Default seed |
| `title` | string | yes | Display title |
| `description` | string | no | Long form |
| `adversarialTags` | string[] | yes | e.g. C1, C2, C5 |
| `contentNotes` | string[] | yes | Policy / content labels |
| `units` | Unit[] | no | Inline units or use fixtures |
| `incidents` | Incident[] | no | Seed CFS |
| `timeline` | TimelineEvent[] | yes | Injects / expects |
| `passConditions` | PassConditions | yes | Pass bar |
| `expectedHardFails` | GradeCode[] | no | Fail-fixture multiset |
| `failDemo` | FailDemo | no | Documented fail path |
| `consoleId` | string | no | Override console |

### Timeline event types

| `type` | Fields | Effect |
|--------|--------|--------|
| `start` | `atMs` | Scenario start marker |
| `expect` | `atMs`, `gradeCode` | Assert code present by time (tests) |
| `expect_not` | `atMs`, `gradeCode` | Assert code absent |
| `inject_note` | `atMs`, `incidentId`, `text`, `author?` | CT/system note |
| `inject_radio` | `atMs`, `from`, `caption`, … | NPC / step-on radio |
| `inject_incident` | `atMs`, `incidentId` | Activate preloaded CFS |
| `command` | `atMs`, `cmd` | Force a PlayerCommand (scripted) |

### `PassConditions`

| Field | Type | Notes |
|-------|------|-------|
| `noHardFails` | boolean | Default true |
| `must` | string[] | Human checklist items |
| `maxSoftWeight` | number | Optional soft cap |
| `requiredSoftAbsent` / `requiredSoftPresent` | GradeCode[] | Golden soft asserts |

---

## `PlayerCommand`

Closed discriminated union of **23** variants. Full field + effect tables: [PLAYER_COMMANDS.md](./PLAYER_COMMANDS.md).

Constant: `PLAYER_COMMAND_COUNT === 23`.

---

## Runtime aggregates (not separate Zod files)

### `SectorState`
Live sim state: clock, units, incidents, radioLog, gradeLog, simLog, channelEmergency, ended.

### `SimEvent`
`{ id, atMs, kind: command|inject|timer|system, command?, detail? }`

### `Debrief`
Pass/fail projection: hardFails, softMarks, timeline, metrics, fixed disclaimer.

---

## Parse helpers

```ts
import {
  IncidentSchema,
  PlayerCommandSchema,
  SessionRecordSchema,
  ScenarioSchema,
  UnitSchema,
  RadioEventSchema,
  GradeEventSchema,
  IncidentTruthSchema,
} from "@sector305/core";

PlayerCommandSchema.parse(raw); // rejects unknown type discriminators
```

---

## Related docs

- [PLAYER_COMMANDS.md](./PLAYER_COMMANDS.md) — command variants
- [RUBRIC.md](./RUBRIC.md) — grade narrative
- [SCENARIO_FORMAT.md](./SCENARIO_FORMAT.md) — authoring overview
- [PHASE0_SCOPE_MANIFEST.md](./PHASE0_SCOPE_MANIFEST.md) — M03a–M03h
