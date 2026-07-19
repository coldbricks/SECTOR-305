#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const catalog = [
  ["checkride_a07_priority_aging_v1", "checkride", "Priority aging — do not tunnel the P4", 305010, ["C2", "C6"], true, ["FAIL_PRIORITY_AGING"]],
  ["checkride_a07_emergency_hold_v1", "checkride", "Emergency traffic — hold the air", 305020, ["C9"], true, ["FAIL_RADIO_EMERGENCY_TRAFFIC"]],
  ["checkride_a07_port_handoff_v1", "checkride", "Port edge — jurisdiction handoff", 305030, ["C7"], true, ["FAIL_JURISDICTION"]],
  ["checkride_a07_dirty_close_v1", "checkride", "Dirty close — units still rolling", 305040, ["C3"], true, ["FAIL_STATUS_DIRTY_CLOSE"]],
  ["checkride_a07_concurrency_v1", "checkride", "Two highs — concurrency tunnel", 305050, ["C6"], true, ["FAIL_CHANNEL_ABANDON"]],
  ["checkride_a07_shots_ocean_v1", "checkride", "Shots heard — Ocean corridor", 305060, ["C2", "C4"], true, null],
  ["checkride_a07_domestic_collins_v1", "checkride", "Domestic — Collins mid-beach", 305070, ["C4"], true, ["FAIL_NO_BACKUP"]],
  ["checkride_a07_traffic_type_v1", "checkride", "Traffic crash — use the right unit", 305080, ["C4"], true, ["FAIL_UNIT_WRONG_TYPE"]],
  ["checkride_a07_wrong_zone_v1", "checkride", "Wrong zone verify trap", 305090, ["C1", "C10"], true, ["FAIL_WRONG_LOCATION", "FAIL_NO_VERIFY"]],
  ["academy_a07_verify_only_v1", "academy", "Academy · Verify before launch", 305110, ["C1"], true, ["FAIL_NO_VERIFY"]],
  ["academy_a07_backup_only_v1", "academy", "Academy · Backup depth", 305120, ["C4"], true, ["FAIL_NO_BACKUP"]],
  ["academy_a07_radio_caption_v1", "academy", "Academy · Air the safety", 305130, ["C5"], true, ["FAIL_SAFETY_NOT_AIRED"]],
  ["academy_a07_readback_v1", "academy", "Academy · Get the readback", 305140, ["C5"], true, ["FAIL_NO_READBACK"]],
  ["academy_a07_status_hygiene_v1", "academy", "Academy · Status hygiene", 305150, ["C3"], true, ["FAIL_STATUS_DIRTY_CLOSE"]],
  ["watch_a07_saturday_pulse_v1", "watch", "Saturday pulse — mid-beach stack", 305210, ["C6"], false, null],
];

const root = "scenarios";
for (const [id, kind, title, seed, tags, noHard, fails] of catalog) {
  const dir = join(root, id);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "scenario.json");
  const doc = {
    id,
    version: "1.0.0",
    kind,
    packId: "miami-a07-police-v0",
    seed,
    title,
    adversarialTags: tags,
    contentNotes: ["fictional", "no-gore", "training-safe"],
    passConditions: { noHardFails: noHard },
  };
  if (fails) doc.expectedHardFailsOnFailSession = fails;
  if (kind === "watch") {
    doc.durationMs = 900000;
    doc.minCfs = 6;
  }
  writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
  console.log("wrote", path);
}
