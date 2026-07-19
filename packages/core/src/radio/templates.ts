export interface RadioTemplate {
  id: string;
  kind: string;
  required_slots: string[];
  optional_slots: string[];
  caption_pattern: string;
  requires_readback_when: "never" | "p0_p1" | "always" | "truth_high";
  preempt_level: "full" | "high" | "medium" | "low" | "none";
}

export const RADIO_TEMPLATES: RadioTemplate[] = [
  {
    id: "DISPATCH_ASSIGN",
    kind: "DISPATCH",
    required_slots: ["to_units", "priority", "nature", "location"],
    optional_slots: ["safety", "cfs_number", "cross_street"],
    caption_pattern: "{to_units}, {priority} {nature}, {location}{safety_clause}",
    requires_readback_when: "truth_high",
    preempt_level: "high",
  },
  {
    id: "DISPATCH_ADD_UNIT",
    kind: "DISPATCH",
    required_slots: ["to_units", "cfs_number", "location"],
    optional_slots: ["nature", "safety"],
    caption_pattern: "{to_units}, add on {cfs_number}, {location}",
    requires_readback_when: "p0_p1",
    preempt_level: "medium",
  },
  {
    id: "DISPATCH_CANCEL",
    kind: "DISPATCH",
    required_slots: ["to_units", "reason"],
    optional_slots: ["cfs_number"],
    caption_pattern: "{to_units}, disregard, {reason}",
    requires_readback_when: "never",
    preempt_level: "medium",
  },
  {
    id: "DISPATCH_REASSIGN",
    kind: "DISPATCH",
    required_slots: ["to_units", "priority", "nature", "location"],
    optional_slots: ["safety", "reason"],
    caption_pattern: "{to_units}, reassign {priority} {nature}, {location}",
    requires_readback_when: "truth_high",
    preempt_level: "high",
  },
  {
    id: "STATUS_QUERY",
    kind: "QUERY",
    required_slots: ["to_units"],
    optional_slots: ["cfs_number"],
    caption_pattern: "{to_units}, status?",
    requires_readback_when: "never",
    preempt_level: "low",
  },
  {
    id: "STATUS_CORRECTION",
    kind: "STATUS",
    required_slots: ["to_units", "status"],
    optional_slots: ["location", "cfs_number"],
    caption_pattern: "{to_units}, show you {status}",
    requires_readback_when: "never",
    preempt_level: "low",
  },
  {
    id: "READBACK_PROMPT",
    kind: "QUERY",
    required_slots: ["to_units", "location"],
    optional_slots: ["nature"],
    caption_pattern: "{to_units}, read back location {location}",
    requires_readback_when: "always",
    preempt_level: "high",
  },
  {
    id: "EMERGENCY_TRAFFIC_OPEN",
    kind: "EMERGENCY",
    required_slots: ["to_units", "location"],
    optional_slots: ["description"],
    caption_pattern: "All units, emergency traffic, {to_units} {location}",
    requires_readback_when: "never",
    preempt_level: "full",
  },
  {
    id: "EMERGENCY_TRAFFIC_CLEAR",
    kind: "EMERGENCY",
    required_slots: [],
    optional_slots: ["reason"],
    caption_pattern: "All units, resume normal traffic",
    requires_readback_when: "never",
    preempt_level: "full",
  },
  {
    id: "BOLO",
    kind: "BOLO",
    required_slots: ["description", "direction"],
    optional_slots: ["location", "safety"],
    caption_pattern: "BOLO: {description}, last {direction}",
    requires_readback_when: "never",
    preempt_level: "medium",
  },
  {
    id: "WELFARE_CHECK_DISPATCH",
    kind: "DISPATCH",
    required_slots: ["to_units", "location"],
    optional_slots: ["description", "cfs_number"],
    caption_pattern: "{to_units}, welfare check, {location}",
    requires_readback_when: "never",
    preempt_level: "low",
  },
  {
    id: "GENERAL_BROADCAST",
    kind: "SYSTEM",
    required_slots: ["description"],
    optional_slots: [],
    caption_pattern: "Attention units: {description}",
    requires_readback_when: "never",
    preempt_level: "none",
  },
];

export function getTemplate(id: string): RadioTemplate | undefined {
  return RADIO_TEMPLATES.find((t) => t.id === id);
}

export function renderTemplate(
  id: string,
  slots: Record<string, string>
): { caption: string; missing: string[]; template: RadioTemplate } {
  const template = getTemplate(id);
  if (!template) {
    return {
      caption: slots.caption ?? "",
      missing: ["template"],
      template: RADIO_TEMPLATES[0]!,
    };
  }
  const missing = template.required_slots.filter(
    (s) => !slots[s] || String(slots[s]).trim() === ""
  );
  let caption = template.caption_pattern;
  const safety = slots.safety?.trim();
  caption = caption.replace(
    "{safety_clause}",
    safety ? `, ${safety}` : ""
  );
  for (const [k, v] of Object.entries(slots)) {
    caption = caption.replaceAll(`{${k}}`, v);
  }
  // strip unfilled optional braces remnants
  caption = caption.replace(/\{[a-z_]+\}/gi, "").replace(/\s+/g, " ").trim();
  return { caption, missing, template };
}

/** Freeform parse for structured grade — slot extraction, not WER */
export function parseFreeformRadio(caption: string): Record<string, string> {
  const out: Record<string, string> = { caption };
  const unitMatch = caption.match(/\b(\d[A-Z]\d{1,3}|[A-Z]{1,3}\d{1,4})\b/gi);
  if (unitMatch) out.to_units = unitMatch.join(", ");
  const pri = caption.match(/\bP[0-5]\b|\bPriority\s*[0-5]\b/i);
  if (pri) out.priority = pri[0]!.toUpperCase().replace(/PRIORITY\s*/i, "P");
  if (/weapon|gun|knife|armed/i.test(caption)) out.safety = "weapons";
  if (/\d{2,5}\s+block|\d{2,5}\s+\w+\s+(drive|ave|street|blvd|road)/i.test(caption)) {
    out.location = caption;
  }
  return out;
}
