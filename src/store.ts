import { useSyncExternalStore } from 'react';
import type { Equb } from './domain/equb';
import type { Iddir } from './domain/iddir';

export type Lang = 'en' | 'am';

export interface State {
  equbs: Equb[];
  iddirs: Iddir[];
  lang: Lang;
}

const KEY = 'equb-iddir-manager:v1';
const empty: State = { equbs: [], iddirs: [], lang: 'en' };

function normalize(value: unknown): State {
  const v = (value ?? {}) as Partial<State>;
  return {
    equbs: Array.isArray(v.equbs) ? v.equbs : [],
    iddirs: Array.isArray(v.iddirs) ? v.iddirs : [],
    lang: v.lang === 'am' ? 'am' : 'en',
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : empty;
  } catch {
    return empty;
  }
}

let state = load();
const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function update(fn: (s: State) => State): void {
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: keep working in memory.
  }
  listeners.forEach((l) => l());
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function updateEqub(id: string, fn: (e: Equb) => Equb): void {
  update((s) => ({ ...s, equbs: s.equbs.map((e) => (e.id === id ? fn(e) : e)) }));
}

export function updateIddir(id: string, fn: (i: Iddir) => Iddir): void {
  update((s) => ({ ...s, iddirs: s.iddirs.map((i) => (i.id === id ? fn(i) : i)) }));
}

export function exportJSON(): string {
  return JSON.stringify(state, null, 2);
}

/** Replaces all data with a backup. Throws if the text is not a valid backup. */
export function importJSON(text: string): void {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.equbs) || !Array.isArray(parsed.iddirs)) {
    throw new Error('Not a valid backup file');
  }
  update(() => normalize(parsed));
}
