# Scenario format (v0)

Phase 0 scenarios are JSON documents validated by `ScenarioSchema` in `@sector305/core`.

**Shipping / sharing:** use the **`.305` pack** standard — folder for authoring, single file for desktop. See **[SCENARIO_PACK_305.md](./SCENARIO_PACK_305.md)**.

```json
{
  "id": "checkride_ocean_robbery_v0",
  "version": "0.1.0",
  "kind": "checkride",
  "packId": "miami-a07-police-v0",
  "seed": 305,
  "title": "Ocean robbery — bad address",
  "adversarialTags": ["C1", "C2", "C5"],
  "contentNotes": ["weapons-in-progress", "no-gore"],
  "units": [],
  "incidents": [],
  "timeline": [
    { "atMs": 0, "type": "start" },
    { "atMs": 15000, "type": "inject_note", "incidentId": "cfs-001", "text": "maybe a knife" },
    { "atMs": 90000, "type": "expect_not", "gradeCode": "FAIL_PRIORITY_AGING" }
  ],
  "passConditions": { "noHardFails": true },
  "expectedHardFails": ["FAIL_NO_VERIFY", "FAIL_PRIORITY_UNDERCODE"],
  "failDemo": {
    "description": "P4 dispatch single unit no verify",
    "expectedHardFails": ["FAIL_PRIORITY_UNDERCODE", "FAIL_NO_VERIFY", "FAIL_NO_BACKUP", "FAIL_NO_READBACK"]
  }
}
```

## Fields

See **docs/SCHEMA.md** §Scenario for every field.

| Field | Notes |
|-------|-------|
| `kind` | `checkride` \| `watch` \| `academy` |
| `units` / `incidents` | Optional inline; fixtures may supply base units |
| `timeline` | Injects, expects, scripted commands |
| `passConditions` | Pass bar for checkride |
| `expectedHardFails` | Fail-fixture multiset |
| `adversarialTags` | Challenge ids (C1–C10) |

## Timeline types

| type | Purpose |
|------|---------|
| `start` | Marker |
| `inject_note` | CT / system note on CFS |
| `inject_radio` | Step-on / incomplete / NPC radio |
| `inject_incident` | Activate preloaded CFS |
| `command` | Scripted `PlayerCommand` |
| `expect` / `expect_not` | Grade code asserts for goldens |

Golden tests may also supply a free-standing `SessionRecord.commands[]` stream expected to pass or fail with listed codes.

Schema validation: Zod in `@sector305/core` (`ScenarioSchema`, `SessionRecordSchema`, `PlayerCommandSchema`).
