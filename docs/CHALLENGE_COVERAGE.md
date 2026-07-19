# C1–C10 challenge coverage

| ID | Challenge | Evidence |
|----|-----------|----------|
| C1 | Incomplete address under P1 | `FAIL_NO_VERIFY` checkride fail + sacred_invariant |
| C2 | Priority flip / undercode | `FAIL_PRIORITY_UNDERCODE` setPriority + dispatch |
| C3 | Illegal status | unit_status_matrix 64-cell illegal edges |
| C4 | Backup under poverty | `FAIL_NO_BACKUP` single-unit P1 weapons |
| C5 | Readback failure | `FAIL_NO_READBACK` timeout test + checkride |
| C6 | Concurrency trap | watch_headless aging; friday night bad play |
| C7 | Jurisdiction handoff | w-008 PORT zone in friday night inject |
| C8 | Language barrier | w-005 ES CT note in friday night |
| C9 | Emergency traffic | radio_protocol emergency hold fail |
| C10 | Information-set fairness | infoset.test.ts delayed knowableSchedule |
