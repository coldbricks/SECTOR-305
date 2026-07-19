/**
 * Keyboard-first M16 path — checkride must be playable without mic (UI_ACCEPTANCE).
 *
 * Keys (when focus not in input/textarea/select):
 *   1–9     select CFS by queue order
 *   V       verify → 1400 Ocean (selected)
 *   P       set P1 (selected)
 *   N       set nature ROBBERY-IP if present else first robbery-like
 *   W / B   flag WEAPONS / BACKUP
 *   D       dispatch 2× AVL patrol
 *   A       sim unit ACKs
 *   O       sim on scene
 *   C       clear GOA
 *   ] / [   +30s / +5s
 *   E       end / debrief
 *   X       export session
 *   ?       toggle help overlay (handled by caller via onToggleHelp)
 */

import { useEffect, useRef } from "react";

export type HotkeyHandlers = {
  onSelectIndex: (i: number) => void;
  onVerify: () => void;
  onPriorityP1: () => void;
  onNatureRobbery: () => void;
  onFlagWeapons: () => void;
  onFlagBackup: () => void;
  onDispatch2: () => void;
  onAck: () => void;
  onOnScene: () => void;
  onClearGoa: () => void;
  onAdvance5: () => void;
  onAdvance30: () => void;
  onDebrief: () => void;
  onExport: () => void;
  onToggleHelp: () => void;
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useConsoleHotkeys(enabled: boolean, h: HotkeyHandlers) {
  const ref = useRef(h);
  ref.current = h;

  useEffect(() => {
    if (!enabled) return;

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const handlers = ref.current;

      const k = e.key;
      if (k >= "1" && k <= "9") {
        e.preventDefault();
        handlers.onSelectIndex(Number(k) - 1);
        return;
      }

      switch (k) {
        case "v":
        case "V":
          e.preventDefault();
          handlers.onVerify();
          break;
        case "p":
        case "P":
          e.preventDefault();
          handlers.onPriorityP1();
          break;
        case "n":
        case "N":
          e.preventDefault();
          handlers.onNatureRobbery();
          break;
        case "w":
        case "W":
          e.preventDefault();
          handlers.onFlagWeapons();
          break;
        case "b":
        case "B":
          e.preventDefault();
          handlers.onFlagBackup();
          break;
        case "d":
        case "D":
          e.preventDefault();
          handlers.onDispatch2();
          break;
        case "a":
        case "A":
          e.preventDefault();
          handlers.onAck();
          break;
        case "o":
        case "O":
          e.preventDefault();
          handlers.onOnScene();
          break;
        case "c":
        case "C":
          e.preventDefault();
          handlers.onClearGoa();
          break;
        case "]":
          e.preventDefault();
          handlers.onAdvance30();
          break;
        case "[":
          e.preventDefault();
          handlers.onAdvance5();
          break;
        case "e":
        case "E":
          e.preventDefault();
          handlers.onDebrief();
          break;
        case "x":
        case "X":
          e.preventDefault();
          handlers.onExport();
          break;
        case "?":
        case "/":
          e.preventDefault();
          handlers.onToggleHelp();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export const HOTKEY_HELP_ROWS: Array<{ keys: string; action: string }> = [
  { keys: "1–9", action: "Select CFS by queue order" },
  { keys: "V", action: "Verify → 1400 Ocean" },
  { keys: "P / N", action: "Priority P1 / nature robbery-IP" },
  { keys: "W / B", action: "Flag WEAPONS / BACKUP" },
  { keys: "D", action: "Dispatch 2× AVL patrol" },
  { keys: "A / O", action: "Sim ACKs / on scene" },
  { keys: "C", action: "Clear GOA" },
  { keys: "[ / ]", action: "+5s / +30s sim" },
  { keys: "E / X", action: "End debrief / export" },
  { keys: "?", action: "Toggle this help" },
];
