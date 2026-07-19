/**
 * Dispatch radio caption discipline meter.
 * Surfaces pack-required elements before TX — process, not vibes.
 */

export type CaptionElement = {
  id: string;
  label: string;
  /** true if caption satisfies this element */
  ok: boolean;
};

type Props = {
  caption: string;
  /** Optional required element ids from pack; defaults to house checkride set */
  required?: string[];
};

const DEFAULT_REQUIRED = ["unit", "priority", "nature", "location", "weapons"];

function scoreCaption(caption: string): Record<string, boolean> {
  const c = caption.toLowerCase();
  return {
    unit:
      /\b\d[a-z]\d{1,3}\b/i.test(caption) ||
      /\bunit\b/.test(c) ||
      /\b3a\d{2}\b/i.test(caption),
    priority: /\bp[0-5]\b/.test(c) || /\bpriority\b/.test(c),
    nature:
      /robber|theft|assault|shoot|stab|disturban|burglar|domestic|weapon|ip\b/.test(
        c
      ),
    location:
      /\d{3,5}/.test(c) ||
      /ocean|collins|street|ave|block|drive|blvd|road|miami/.test(c),
    weapons: /weapon|gun|knife|firearm|armed|gunshot|shot/.test(c),
  };
}

export function radioCaptionElements(
  caption: string,
  required: string[] = DEFAULT_REQUIRED
): CaptionElement[] {
  const scored = scoreCaption(caption);
  return required.map((id) => ({
    id,
    label: id.toUpperCase(),
    ok: !!scored[id],
  }));
}

export function RadioCaptionMeter({ caption, required = DEFAULT_REQUIRED }: Props) {
  const els = radioCaptionElements(caption, required);
  const okCount = els.filter((e) => e.ok).length;
  const ready = okCount === els.length;

  return (
    <div
      className={`radio-caption-meter ${ready ? "ready" : "thin"}`}
      aria-label="Radio caption completeness"
    >
      <div className="rcm-head mono">
        <span>AIR DISCIPLINE</span>
        <span className={ready ? "ok" : "warn"}>
          {okCount}/{els.length}
          {ready ? " · READY" : " · THIN TX"}
        </span>
      </div>
      <div className="rcm-chips">
        {els.map((e) => (
          <span key={e.id} className={`rcm-chip ${e.ok ? "ok" : "miss"}`}>
            {e.label}
          </span>
        ))}
      </div>
      {!ready ? (
        <p className="rcm-hint">
          Pack wants unit · priority · nature · location on the air. Weapons on
          P1 robbery when knowable.
        </p>
      ) : null}
    </div>
  );
}
