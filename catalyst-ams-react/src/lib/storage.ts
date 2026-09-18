import type { TrainerState } from '@/types';

const STORAGE_KEY = 'coi-ams-react-v1';

export function defaultState(): TrainerState {
  return { forms: {}, passed: {}, attempts: {}, associated: {} };
}

export function loadState(): TrainerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(state: TrainerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode, quota) - training progress just won't persist
  }
}
