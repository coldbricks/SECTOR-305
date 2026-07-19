# SECTOR 305 — Checkride rubric

**Stable fail codes** are the product vocabulary. CI and debrief use the same strings.  
**Source of truth (unions):** `packages/core/src/grade/codes.ts`

## Hard fails (any = checkride fail)

| Code | Domain | Trigger |
|------|--------|---------|
| `FAIL_NO_VERIFY` | LOC | High-acuity dispatch with unverified/conflicting location |
| `FAIL_WRONG_LOCATION` | LOC | “Verified” zone ≠ truth zone |
| `FAIL_PRIORITY_UNDERCODE` | PRI | Priority set/dispatched below truth on weapons/IP/P0–P1 |
| `FAIL_PRIORITY_AGING` | TIM | P0–P2 pending past dispatch SLA |
| `FAIL_HOLD_HIGH_PRIORITY` | TIM | Hold/stack P0–P1 |
| `FAIL_NO_BACKUP` | ASN | High-risk needs ≥N units |
| `FAIL_UNIT_NOT_ASSIGNABLE` | ASN | Assign OOS/ER/etc. |
| `FAIL_UNIT_WRONG_TYPE` | ASN | Wrong resource type for nature when pack hard-requires |
| `FAIL_STATUS_ILLEGAL` | STA | Illegal status edge (incl. skip ER) |
| `FAIL_STATUS_DIRTY_CLOSE` | STA | Close while units DIS/ER/OS |
| `FAIL_STATUS_STALE` | STA | Overdue ER/OS without status hygiene |
| `FAIL_NO_READBACK` | RAD | P0/P1 dispatch, no unit ACK in window |
| `FAIL_RADIO_FORMAT` | RAD | Dispatch missing required elements (location) |
| `FAIL_RADIO_EMERGENCY_TRAFFIC` | RAD | Routine TX during emergency hold |
| `FAIL_READBACK_WRONG` | RAD | Structured ACK missing required slots |
| `FAIL_RECLASS_NO_RADIO` | RAD | Priority upgrade with units rolling, no re-tone |
| `FAIL_SAFETY_NOT_AIRED` | SAF | Weapons known, not in radio caption |
| `FAIL_NO_DISPOSITION` | DOC | Clear without disposition |
| `FAIL_NARRATIVE_MISSING_CRITICAL` | DOC | Critical reclass/safety with empty narrative |
| `FAIL_JURISDICTION` | ASN | Hard jurisdiction violation |
| `FAIL_DIVERT_WITHOUT_LOG` | ASN | Divert/release ER/OS without reason |
| `FAIL_CHANNEL_ABANDON` | MUL | Lost second high-acuity under concurrency |
| `FAIL_DOUBLE_ASSIGN_CONFLICT` | ASN | Unit double-assigned conflict |
| `FAIL_INFOSET_VIOLATION` | CON | Grader bug guard — should never fire on fair player play |

## Soft marks

| Code | Domain | Trigger |
|------|--------|---------|
| `SOFT_PRIORITY_LOW` | PRI | Mild undercode without weapons/IP |
| `SOFT_RADIO_FORMAT` | RAD | Missing non-critical radio elements |
| `SOFT_RADIO_WORDY` | RAD | Excessively wordy freeform |
| `SOFT_SLOW_KEY` | TIM | Slow key-up / late first action soft |
| `SOFT_DOWNGRADE_WHILE_ROLLING` | PRI | Downgrade while unit ER/OS |
| `SOFT_NOTE_THIN` | DOC | Sparse narrative after material change |
| `SOFT_UNIT_SUBOPTIMAL_TYPE` | ASN | Suboptimal but legal unit type |
| `SOFT_STATUS_QUERY_LATE` | STA | Late status check on overdue unit |
| `SOFT_LANGUAGE_NO_ATTEMPT` | CON | Language need knowable, no attempt |
| `SOFT_STACK_REASON_THIN` | TIM | Hold reason too thin |
| `SOFT_MAP_OVERTRUST` | LOC | Over-trust imperfect map |
| `SOFT_CALLBACK_NOT_LOGGED` | DOC | Callback not logged |
| `SOFT_BOLO_INCOMPLETE` | RAD | BOLO missing slots |
| `SOFT_TIMER_WARNING_IGNORED` | TIM | Timer warning ignored |
| `SOFT_CONCURRENCY_TUNNEL` | MUL | Tunnel vision on single CFS under load |

## Pass bar (house)

- Zero hard fails  
- Soft marks recorded for coaching (threshold scoring later)  
- Checkride must include concurrency pressure when scenario says so  

## What we do **not** grade (yet)

- Microphone quality / WER  
- “Felt heroic”  
- Omniscient truth the player could not know  
- LLM vibe scores  

## STT rule (locked)

Voice is an optional encoder into the same structured commands. **Checkrides must pass keyboard-only.** STT never produces a hard fail by absence.
