import { writable } from 'svelte/store';
import type { SimResults } from '../lib/sim/engine.js';

export interface RunRecord {
  results: SimResults;
  /** Opacity for comparison overlay (1 = current run) */
  opacity: number;
}

export const runHistory = writable<RunRecord[]>([]);
export const isSimulating = writable(false);
export const cursorTime = writable<number | null>(null);

const MAX_HISTORY = 3;

export function pushResults(results: SimResults): void {
  runHistory.update((history) => {
    const aged = history.map((r) => ({ ...r, opacity: r.opacity * 0.45 }));
    return [{ results, opacity: 1 }, ...aged].slice(0, MAX_HISTORY);
  });
}

export function clearHistory(): void {
  runHistory.set([]);
}
