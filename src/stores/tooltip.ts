import { writable } from 'svelte/store';
import type { Variable } from '../lib/xmile/types.js';

export interface TooltipState {
  variable: Variable;
  x: number;
  y: number;
  currentValue?: number;
}

export const tooltip = writable<TooltipState | null>(null);

export function showTooltip(variable: Variable, x: number, y: number, currentValue?: number): void {
  tooltip.set({ variable, x, y, currentValue });
}

export function hideTooltip(): void {
  tooltip.set(null);
}
