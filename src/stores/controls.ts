import { writable, derived } from 'svelte/store';
import type { Model } from '../lib/xmile/types.js';
import { sliderVars, toggleVars } from '../lib/xmile/conventions.js';

export const paramValues = writable<Map<string, number>>(new Map());
export const toggleStates = writable<Map<string, boolean>>(new Map());

/** Initialise controls from a freshly loaded model */
export function initControls(model: Model): void {
  const params = new Map<string, number>();
  for (const v of sliderVars(model.variables)) {
    const spec = v.control!;
    if (spec.kind === 'slider') params.set(v.name, spec.default);
  }

  const toggles = new Map<string, boolean>();
  for (const v of toggleVars(model.variables)) {
    const spec = v.control!;
    if (spec.kind === 'toggle') toggles.set(v.name, spec.default);
  }

  paramValues.set(params);
  toggleStates.set(toggles);
}

export const controlState = derived(
  [paramValues, toggleStates],
  ([$params, $toggles]) => ({ params: $params, toggles: $toggles }),
);

export function setParam(name: string, value: number): void {
  paramValues.update((m) => {
    const next = new Map(m);
    next.set(name, value);
    return next;
  });
}

export function setToggle(name: string, value: boolean): void {
  toggleStates.update((m) => {
    const next = new Map(m);
    next.set(name, value);
    return next;
  });
}

export function resetControls(model: Model): void {
  initControls(model);
}
