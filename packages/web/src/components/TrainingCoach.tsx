import { useEffect, useMemo, useRef, useState } from "react";
import type { MasteryFocus, SectorState } from "@sector305/core";
import {
  OCEAN_WALKTHROUGH,
  firstIncompleteStep,
  requiredStepsComplete,
  stepProgress,
  type CoachContext,
} from "../training/oceanWalkthrough";
import { consoleAudio } from "../audio/consoleAudio";
import { radioSpeech } from "../audio/radioSpeech";

type Props = {
  state: SectorState;
  selectedId: string | null;
  ownedIds: Set<string>;
  fireDispatches: number;
  heloSeen: boolean;
  trafficSeen: boolean;
  onAdvanceSim?: (ms: number) => void;
  collapsed?: boolean;
  focus: MasteryFocus;
};

export function TrainingCoach(props: Props) {
  const [open, setOpen] = useState(() => {
    if (props.collapsed != null) return !props.collapsed;
    return !window.matchMedia("(max-width: 760px)").matches;
  });
  const [manualIdx, setManualIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const prevAutoIdx = useRef<number | null>(null);

  const ctx: CoachContext = useMemo(
    () => ({
      state: props.state,
      selectedId: props.selectedId,
      ownedIds: props.ownedIds,
      fireDispatches: props.fireDispatches,
      heloSeen: props.heloSeen,
      trafficSeen: props.trafficSeen,
    }),
    [
      props.state,
      props.selectedId,
      props.ownedIds,
      props.fireDispatches,
      props.heloSeen,
      props.trafficSeen,
    ]
  );

  const autoIdx = firstIncompleteStep(ctx);
  const idx = auto ? autoIdx : manualIdx;
  const step = OCEAN_WALKTHROUGH[idx]!;
  const complete = requiredStepsComplete(ctx);
  const prog = stepProgress(ctx);

  // Celebrate required-step completion (auto path advances)
  useEffect(() => {
    if (!auto) return;
    if (prevAutoIdx.current != null && autoIdx > prevAutoIdx.current) {
      consoleAudio.play("ding");
    }
    prevAutoIdx.current = autoIdx;
  }, [autoIdx, auto]);

  // Dave trainer voice when the coach step changes (baked clip by id)
  const lastSpokenStep = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !step) return;
    if (lastSpokenStep.current === step.id) return;
    lastSpokenStep.current = step.id;
    const clipId = step.trainerClipId;
    if (clipId) {
      void radioSpeech.playClipById(clipId, {
        kind: "TRAINER",
        direction: "trainer",
      });
    } else {
      void radioSpeech.playTrainer(`${step.title}. ${step.body}`);
    }
  }, [open, step?.id, step?.trainerClipId, step?.title, step?.body]);

  if (!open) {
    return (
      <button
        type="button"
        className="coach-fab"
        onClick={() => {
          setOpen(true);
          consoleAudio.play("ui");
        }}
      >
        COACH · {prog.requiredDone}/{prog.requiredTotal}
        {complete ? " · OK" : ""}
      </button>
    );
  }

  return (
    <aside className="training-coach" aria-label="Training walkthrough coach">
      <div className="coach-head">
        <div>
          <div className="coach-kicker mono">ACADEMY · INSTRUMENT PATH</div>
          <div className="coach-title">Ocean checkride coach</div>
        </div>
        <div className="coach-head-actions">
          <button
            type="button"
            className={auto ? "on" : ""}
            title="Auto-advance when required steps complete"
            onClick={() => {
              setAuto((a) => !a);
              consoleAudio.play("ui");
            }}
          >
            AUTO
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              consoleAudio.play("ui");
            }}
          >
            −
          </button>
        </div>
      </div>

      <div className="coach-progress mono">
        REQ {prog.requiredDone}/{prog.requiredTotal}
        {prog.optionalTotal > 0
          ? ` · OPT ${prog.optionalDone}/${prog.optionalTotal}`
          : ""}
        <span className="coach-bar">
          <i
            style={{
              width: `${(prog.requiredDone / Math.max(1, prog.requiredTotal)) * 100}%`,
            }}
          />
        </span>
        {complete ? " · PATH COMPLETE" : ""}
      </div>

      <div className={`coach-mastery mode-${props.focus.mode}`}>
        <span className="coach-mastery-k mono">WATCH FOCUS · {props.focus.label}</span>
        <strong>{props.focus.title}</strong>
        <p>{props.focus.brief}</p>
      </div>

      <div className="coach-chip mono">
        {step.chip}
        {step.optional ? " · OPTIONAL" : ""}
      </div>
      <h3 className="coach-h">{step.title}</h3>
      <p className="coach-body">{step.body}</p>
      <div className="coach-action">
        <span className="coach-action-k">DO NOW</span>
        {step.action}
      </div>

      {step.suggestAdvanceMs && props.onAdvanceSim ? (
        <button
          type="button"
          className="coach-advance primary"
          onClick={() => {
            props.onAdvanceSim?.(step.suggestAdvanceMs!);
            consoleAudio.play("tick");
          }}
        >
          Advance sim +{(step.suggestAdvanceMs / 1000).toFixed(0)}s
        </button>
      ) : null}

      {step.optional ? (
        <button
          type="button"
          className="coach-skip"
          onClick={() => {
            setAuto(false);
            // jump to next required after this optional
            let next = idx + 1;
            while (
              next < OCEAN_WALKTHROUGH.length &&
              OCEAN_WALKTHROUGH[next]!.optional
            ) {
              next++;
            }
            setManualIdx(Math.min(next, OCEAN_WALKTHROUGH.length - 1));
            consoleAudio.play("ui");
          }}
        >
          Skip optional →
        </button>
      ) : null}

      <div className="coach-steps-rail">
        {OCEAN_WALKTHROUGH.map((s, i) => {
          const done = s.done(ctx);
          return (
            <button
              key={s.id}
              type="button"
              className={`coach-dot ${done ? "done" : ""} ${i === idx ? "cur" : ""} ${s.optional ? "opt" : ""}`}
              title={`${s.title}${s.optional ? " (optional)" : ""}`}
              onClick={() => {
                setAuto(false);
                setManualIdx(i);
                consoleAudio.play("tick");
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="coach-nav">
        <button
          type="button"
          disabled={idx <= 0}
          onClick={() => {
            setAuto(false);
            setManualIdx(Math.max(0, idx - 1));
            consoleAudio.play("ui");
          }}
        >
          BACK
        </button>
        <button
          type="button"
          disabled={idx >= OCEAN_WALKTHROUGH.length - 1}
          onClick={() => {
            setAuto(false);
            setManualIdx(Math.min(OCEAN_WALKTHROUGH.length - 1, idx + 1));
            consoleAudio.play("ui");
          }}
        >
          NEXT
        </button>
      </div>
    </aside>
  );
}
