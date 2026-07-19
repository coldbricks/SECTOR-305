import {
  coerceMasteryProfile,
  createMasteryProfile,
  type MasteryProfile,
} from "@sector305/core";

export const MASTERY_STORAGE_KEY = "s305.mastery.v1";

type MasteryStorage = Pick<Storage, "getItem" | "setItem">;

export function loadMasteryProfile(
  storage: MasteryStorage = window.localStorage
): MasteryProfile {
  try {
    const raw = storage.getItem(MASTERY_STORAGE_KEY);
    if (!raw) return createMasteryProfile();
    return coerceMasteryProfile(JSON.parse(raw));
  } catch {
    return createMasteryProfile();
  }
}

export function saveMasteryProfile(
  profile: MasteryProfile,
  storage: MasteryStorage = window.localStorage
): void {
  try {
    storage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Training remains usable when storage is blocked or full.
  }
}
