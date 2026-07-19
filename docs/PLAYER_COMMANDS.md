# SECTOR 305 — PlayerCommand (Phase 0 closed set)

**Count: 23**  
**Schema:** `packages/core/src/schema/playerCommand.ts`  
**Manifest:** M03h · `docs/PHASE0_SCOPE_MANIFEST.md`  
**Reducer:** `Runtime.apply` — exhaustive `switch` with `never` check  
**Parse:** `PlayerCommandSchema` (Zod discriminated union, `.strict()`)

No open `string` command type. Unknown discriminators fail Zod parse and must not compile against `PlayerCommand`.

Legacy note: `ForceUnitAck` is **not** in the closed set. Use `UnitRadioRx` with `kind: "ACK"`.

---

## 1. `VerifyLocation`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"VerifyLocation"` | yes |
| `incidentId` | string | yes |
| `confidence` | `verified` \| `partial` \| `unverified` \| `conflicting` | yes |
| `location` | partial `LocationRef` | no |

**Effects**

- Sets CFS `locationConfidence` and merges optional location fields.
- On verified/partial with correct truth zone, may align freeform to truth location (grader path).
- Sets `enteredAtMs` if null; appends player note; touches `lastUpdateAtMs`.
- Enables high-acuity dispatch gate (avoids `FAIL_NO_VERIFY` when confidence is verified/partial).

**Grades (indirect)**

- Wrong zone after verify → `FAIL_WRONG_LOCATION` at dispatch.
- Dispatch still unverified/conflicting on high acuity → `FAIL_NO_VERIFY`.

---

## 2. `SetPriority`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"SetPriority"` | yes |
| `incidentId` | string | yes |
| `priority` | PriorityCode | yes |
| `reason` | string | no (recommended on downgrade) |

**Effects**

- Writes `priorityHistory` entry; updates `priority`; system/player note; touches timestamps.
- Downgrade while unit ER/OS → `SOFT_DOWNGRADE_WHILE_ROLLING`.
- Undercode vs truth weapons/IP/P0–P1 → `FAIL_PRIORITY_UNDERCODE`.
- Mild undercode → `SOFT_PRIORITY_LOW`.

---

## 3. `SetNature`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"SetNature"` | yes |
| `incidentId` | string | yes |
| `natureCode` | string | yes |
| `natureText` | string | no |

**Effects**

- Sets nature code/text from pack.
- Auto-flags from pack nature: `NEEDS_BACKUP`, `WEAPONS`, `IN_PROGRESS` when defaults apply.
- Appends note; touches timestamps.

---

## 4. `AddNote`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"AddNote"` | yes |
| `incidentId` | string | yes |
| `text` | string ≥ 1 | yes |

**Effects**

- Append-only `CadNote` with `author: "player"`.
- No edit/delete path exists.
- Thin narrative after critical reclass may later mark `SOFT_NOTE_THIN` / `FAIL_NARRATIVE_MISSING_CRITICAL`.

---

## 5. `SetFlag`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"SetFlag"` | yes |
| `incidentId` | string | yes |
| `flag` | IncidentFlag (closed enum) | yes |
| `value` | boolean | yes |

**Effects**

- Adds/removes flag from closed set.
- Weapons/backup flags feed radio safety and backup grading.

---

## 6. `DispatchUnits`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"DispatchUnits"` | yes |
| `incidentId` | string | yes |
| `unitIds` | string[] (min 1) | yes |
| `radioCaption` | string | no |

**Effects**

- Assigns assignable units → `DIS`; sets `assignedIncidentId`, primary unit, `firstDispatchAtMs`.
- CFS → `DISPATCHED` from PENDING/HOLD.
- Emits dispatch `RadioEvent`; may require readback window.
- Grades: undercode at dispatch, verify gate, wrong location, assignable, illegal status, backup, weapons aired, radio format.

**Primary grades**

- `FAIL_PRIORITY_UNDERCODE`, `FAIL_NO_VERIFY`, `FAIL_WRONG_LOCATION`
- `FAIL_UNIT_NOT_ASSIGNABLE`, `FAIL_STATUS_ILLEGAL`, `FAIL_NO_BACKUP`
- `FAIL_SAFETY_NOT_AIRED`, `FAIL_RADIO_FORMAT` / `SOFT_RADIO_FORMAT`
- Later timeout → `FAIL_NO_READBACK`

---

## 7. `AddUnitToIncident`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"AddUnitToIncident"` | yes |
| `incidentId` | string | yes |
| `unitId` | string | yes |
| `radioCaption` | string | no |

**Effects**

- Adds a single additional unit to an existing CFS (backup / second unit).
- Rejects double-assign → `FAIL_DOUBLE_ASSIGN_CONFLICT`.
- Delegates core assign/radio path through dispatch grading for that unit.

---

## 8. `ReleaseUnit`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"ReleaseUnit"` | yes |
| `unitId` | string | yes |
| `reason` | string | no (required for clean divert while ER/OS) |

**Effects**

- Removes unit from CFS assignment; clears `assignedIncidentId`.
- Moves unit toward AVL/CLR when legal.
- Divert without reason while ER/OS → `FAIL_DIVERT_WITHOUT_LOG`.

---

## 9. `SetUnitStatus`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"SetUnitStatus"` | yes |
| `unitId` | string | yes |
| `status` | UnitStatus | yes |
| `note` | string | no |

**Effects**

- Legal pack graph edge only; illegal → `FAIL_STATUS_ILLEGAL` (status unchanged).
- `ER` sets `firstEnRouteAtMs` if first.
- `OS` sets `firstOnSceneAtMs`, CFS → `WORKING`.
- `AVL` clears assignment from CFS.
- Updates `lastKnownAtMs` / `statusChangedAtMs`.
- Optional note becomes a system radio STATUS line.

---

## 10. `RadioTx` (template + slots)

| Field | Type | Required |
|-------|------|----------|
| `type` | `"RadioTx"` | yes |
| `templateId` | RadioTemplateId | yes |
| `slots` | Record\<RadioSlotName, string\> | yes |
| `channelId` | string | no |
| `incidentId` | string | no |
| `unitId` | string | no |
| `requiresReadback` | boolean | no |

**Effects**

- Fills caption from template slots; logs dispatch_tx `RadioEvent` with `templateId` + structured slots.
- `EMERGENCY_TRAFFIC_OPEN` / `CLEAR` toggles `channelEmergency`.
- Non-emergency TX during emergency hold → `FAIL_RADIO_EMERGENCY_TRAFFIC`.

**Slot names (closed):**  
`to_units`, `from_console`, `priority`, `nature`, `location`, `cross_street`, `safety`, `cfs_number`, `status`, `direction`, `description`, `reason`, `channel`

---

## 11. `RadioTxFreeform`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"RadioTxFreeform"` | yes |
| `to` | string | yes |
| `kind` | RadioKind | yes |
| `caption` | string ≥ 1 | yes |
| `channelId` | string | no |
| `incidentId` | string | no |
| `unitId` | string | no |
| `requiresReadback` | boolean | no |
| `structured` | Record\<string, string\|number\|boolean\> | no |

**Effects**

- Freeform dispatch TX still graded as structured process (not WER).
- Same emergency-traffic gate as template TX.
- `kind: "EMERGENCY"` sets channel emergency hold.

---

## 12. `AckReadback`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"AckReadback"` | yes |
| `radioEventId` | string | yes |

**Effects**

- Marks target radio event `readbackSatisfiedAtMs`.
- Clears pending readback timer (prevents `FAIL_NO_READBACK`).

---

## 13. `UnitRadioRx`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"UnitRadioRx"` | yes |
| `unitId` | string | yes |
| `caption` | string ≥ 1 | yes |
| `kind` | RadioKind | no (default ACK path) |
| `incidentId` | string | no |
| `satisfiesReadbackFor` | string | no (radio event id) |

**Effects**

- Logs unit_tx event.
- Satisfies pending readback for unit (or explicit radio id).
- Phrase heuristics: “en route” → ER; “on scene” → OS (via status graph).

---

## 14. `ClearIncident`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"ClearIncident"` | yes |
| `incidentId` | string | yes |
| `disposition` | string ≥ 1 | yes |

**Effects**

- CFS → `CLEARED`; sets disposition + `clearedAtMs`.
- Empty disposition path → `FAIL_NO_DISPOSITION` (schema already requires min 1; runtime still guards).
- Units still DIS/ER/OS → `FAIL_STATUS_DIRTY_CLOSE`.
- Assigned units forced AVL and unassigned.

---

## 15. `CancelIncident`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"CancelIncident"` | yes |
| `incidentId` | string | yes |
| `disposition` | string | no (default `CAN`) |

**Effects**

- CFS → `CANCELLED`; clears assignment; stamps clear time.

---

## 16. `HoldIncident`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"HoldIncident"` | yes |
| `incidentId` | string | yes |
| `reason` | string ≥ 1 | yes |

**Effects**

- CFS → `HOLD` with reason note.
- Hold/stack P0–P1 → `FAIL_HOLD_HIGH_PRIORITY`.
- Thin reason may later mark `SOFT_STACK_REASON_THIN`.

---

## 17. `RequestStatusCheck`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"RequestStatusCheck"` | yes |
| `unitId` | string | yes |
| `incidentId` | string | no |

**Effects**

- Emits STATUS_QUERY template radio: “{callsign}, status check”.
- Used for overdue ER/OS hygiene; late omission → `SOFT_STATUS_QUERY_LATE`.

---

## 18. `Advance`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"Advance"` | yes |
| `ms` | number > 0 | yes |

**Effects**

- Advances pure sim clock by `ms`.
- Fires timers: readback timeout (`FAIL_NO_READBACK`), priority aging (`FAIL_PRIORITY_AGING`).
- Only command allowed when sector `ended` (no-op on others when ended).

---

## 19. `InjectIncident`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"InjectIncident"` | yes |
| `incident` | inject body (see below) | yes |

**Inject body fields:**  
`id`, `cfsNumber`, `priority`, `natureCode`, `natureText`, `location`, `locationConfidence`, `jurisdictionId`, `createdAtMs`, `receivedAtMs`, `callerLanguage`, `truth` (required); optional `enteredAtMs`, `flags`, `status`.

**Effects**

- Scenario/runtime inject of a new CFS at current clock.
- Initializes empty notes/assignments and liability nulls.
- Not a normal player UI control (debug / scenario engine).

---

## 20. `InjectRadio`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"InjectRadio"` | yes |
| `from` | string | yes |
| `caption` | string ≥ 1 | yes |
| `channelId` | string | no |
| `direction` | RadioDirection | no (default unit_tx) |
| `to` | string \| null | no |
| `kind` | RadioKind | no |
| `incidentId` | string | no |
| `unitId` | string | no |
| `steppedOn` | boolean | no |
| `incomplete` | boolean | no |
| `requiresReadback` | boolean | no |

**Effects**

- Scenario inject of RX/TX content (step-on, incomplete chatter).
- Sets `steppedOn` / `incomplete` on the radio log for C9-style content.
- Does not require player mic.

---

## 21. `SetChannelEmergency`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"SetChannelEmergency"` | yes |
| `active` | boolean | yes |
| `reason` | string | no |

**Effects**

- Sets `SectorState.channelEmergency`.
- Logs system EMERGENCY open/clear caption.
- While active, routine freeform/template TX grades `FAIL_RADIO_EMERGENCY_TRAFFIC`.

---

## 22. `LinkDuplicate`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"LinkDuplicate"` | yes |
| `incidentId` | string | yes (duplicate) |
| `primaryIncidentId` | string | yes (survivor) |
| `reason` | string | no |

**Effects**

- Duplicate CFS → `LINKED_DUP`; `linkedIncidentId` = primary; disposition default `DUP`.
- Releases units on duplicate; notes both CFS records.

---

## 23. `NoOp`

| Field | Type | Required |
|-------|------|----------|
| `type` | `"NoOp"` | yes |
| `reason` | string | no |

**Effects**

- Logged on sim timeline only. No state mutation. Useful for scripted streams / padding.

---

## Exhaustive type list

```
VerifyLocation
SetPriority
SetNature
AddNote
SetFlag
DispatchUnits
AddUnitToIncident
ReleaseUnit
SetUnitStatus
RadioTx
RadioTxFreeform
AckReadback
UnitRadioRx
ClearIncident
CancelIncident
HoldIncident
RequestStatusCheck
Advance
InjectIncident
InjectRadio
SetChannelEmergency
LinkDuplicate
NoOp
```

`PLAYER_COMMAND_TYPES.length === 23` · `PLAYER_COMMAND_COUNT === 23`

---

## SessionRecord embedding

```json
{
  "schemaVersion": 1,
  "scenarioId": "checkride_ocean_robbery_v0",
  "packId": "miami-a07-police-v0",
  "packVersion": "0.1.0",
  "seed": 305,
  "engineVersion": "0.1.0",
  "commands": [
    { "atMs": 2000, "cmd": { "type": "VerifyLocation", "incidentId": "cfs-001", "confidence": "verified" } }
  ]
}
```

Replay: `Runtime.applyAll(record.commands)` → identical grade multisets (sacred invariant).
