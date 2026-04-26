import type { ControlSpec, Variable } from './types.js';

/** Normalize a variable name: lowercase, spaces/hyphens → underscores */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '_');
}

/** Strip the player-facing prefix and return the display name */
export function stripPrefix(name: string): string {
  return name.replace(/^(param|toggle|chart)_/, '');
}

/** Derive ControlSpec from naming convention + optional range metadata */
export function controlSpecFromConvention(
  varKind: 'stock' | 'flow' | 'aux',
  name: string,
  rangeMin?: number,
  rangeMax?: number,
  rangeStep?: number,
  defaultValue?: number,
): ControlSpec | undefined {
  const lower = name.toLowerCase();

  if (varKind === 'aux' && lower.startsWith('param_')) {
    const def = defaultValue ?? 0;
    const min = rangeMin ?? 0;
    const max = rangeMax ?? (def * 2 || 100);
    if (rangeMin === undefined || rangeMax === undefined) {
      console.warn(`[xmile] param "${name}" has no <range>; defaulting to [${min}, ${max}]`);
    }
    return {
      kind: 'slider',
      min,
      max,
      step: rangeStep ?? (max - min) / 20,
      default: def,
    };
  }

  if (varKind === 'flow' && lower.startsWith('toggle_')) {
    return { kind: 'toggle', default: true };
  }

  if ((varKind === 'stock' || varKind === 'aux') && lower.startsWith('chart_')) {
    return { kind: 'chart' };
  }

  return undefined;
}

/** Return all variables that should appear on the default chart */
export function defaultChartVars(variables: Variable[]): Variable[] {
  return variables.filter(
    (v) => v.control?.kind === 'chart' || v.name.toLowerCase().startsWith('chart_'),
  );
}

/** Return all slider-controlled auxiliaries */
export function sliderVars(variables: Variable[]): Variable[] {
  return variables.filter((v) => v.control?.kind === 'slider');
}

/** Return all toggle-controlled flows */
export function toggleVars(variables: Variable[]): Variable[] {
  return variables.filter((v) => v.control?.kind === 'toggle');
}
