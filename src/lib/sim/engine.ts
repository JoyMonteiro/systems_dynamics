import type { Model, Variable, StockVar, FlowVar, AuxVar } from '../xmile/types.js';

// ---------------------------------------------------------------------------
// Expression preprocessing — convert XMILE syntax to JS
// ---------------------------------------------------------------------------

function preprocessExpr(expr: string): string {
  return (
    expr
      // IF THEN ELSE → ternary (handles simple non-nested case)
      .replace(/\bIF\b\s*([\s\S]*?)\s*\bTHEN\b\s*([\s\S]*?)\s*\bELSE\b\s*([\s\S]*?)$/i, '(($1)?($2):($3))')
      // Boolean operators
      .replace(/\bAND\b/gi, '&&')
      .replace(/\bOR\b/gi, '||')
      .replace(/\bNOT\b\s*\(/gi, '!(')
      // Exponentiation
      .replace(/\^/g, '**')
      // XMILE math functions
      .replace(/\bMAX\s*\(/gi, 'Math.max(')
      .replace(/\bMIN\s*\(/gi, 'Math.min(')
      .replace(/\bABS\s*\(/gi, 'Math.abs(')
      .replace(/\bSIN\s*\(/gi, 'Math.sin(')
      .replace(/\bCOS\s*\(/gi, 'Math.cos(')
      .replace(/\bTAN\s*\(/gi, 'Math.tan(')
      .replace(/\bEXP\s*\(/gi, 'Math.exp(')
      .replace(/\bLN\s*\(/gi, 'Math.log(')
      .replace(/\bLOG\s*\(/gi, 'Math.log10(')
      .replace(/\bSQRT\s*\(/gi, 'Math.sqrt(')
      .replace(/\bINT\s*\(/gi, 'Math.floor(')
      .replace(/\bINTEGER\s*\(/gi, 'Math.floor(')
      .replace(/\bPI\b/g, 'Math.PI')
      .replace(/\bMODULO\s*\(/gi, '_mod(')
      .replace(/\bSTEP\s*\(/gi, '_step(')
      .replace(/\bPULSE\s*\(/gi, '_pulse(')
      .replace(/\bRAMP\s*\(/gi, '_ramp(')
  );
}

// Replace variable name occurrences in an expression with their normalized equivalents.
// Sorts by length desc to avoid partial matches (e.g. "a" clobbering "ab").
function normalizeVarRefs(expr: string, allNames: string[]): string {
  let result = expr;
  const sorted = [...allNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), name);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Evaluator — uses `with` to expose scope without renaming variables
// ---------------------------------------------------------------------------

type Evaluator = (scope: Record<string, number>) => number;

const _builtins = {
  _mod: (a: number, b: number) => ((a % b) + b) % b,
  _step: (height: number, stepTime: number, time: number) => (time >= stepTime ? height : 0),
  _pulse: (magnitude: number, firstPulse: number, interval: number, time: number) => {
    if (time < firstPulse) return 0;
    if (interval <= 0) return time === firstPulse ? magnitude : 0;
    return ((time - firstPulse) % interval) === 0 ? magnitude : 0;
  },
  _ramp: (slope: number, startTime: number, time: number) =>
    time >= startTime ? slope * (time - startTime) : 0,
};

function makeEvaluator(rawExpr: string): Evaluator {
  const processed = preprocessExpr(rawExpr);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(
    '$scope',
    '$b',
    `with($b){with($scope){return(${processed});}}`,
  );
  return (scope: Record<string, number>): number => {
    try {
      const result = fn(scope, _builtins);
      return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  };
}

// ---------------------------------------------------------------------------
// Dependency-ordered auxiliary evaluation
// ---------------------------------------------------------------------------

function extractVarRefs(expr: string, knownNames: Set<string>): string[] {
  const refs: string[] = [];
  for (const name of knownNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(expr)) {
      refs.push(name);
    }
  }
  return refs;
}

function topoSort(vars: Variable[], knownNames: Set<string>): Variable[] {
  const visited = new Set<string>();
  const result: Variable[] = [];

  function visit(v: Variable) {
    if (visited.has(v.name)) return;
    visited.add(v.name);
    const deps = extractVarRefs(v.eqn, knownNames);
    for (const dep of deps) {
      const depVar = vars.find((x) => x.name === dep);
      if (depVar && depVar.kind !== 'stock') visit(depVar);
    }
    result.push(v);
  }

  for (const v of vars) visit(v);
  return result;
}

// ---------------------------------------------------------------------------
// SimResults
// ---------------------------------------------------------------------------

export interface SimResults {
  times: number[];
  series: Map<string, number[]>;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class Engine {
  private model: Model;
  private stocks: StockVar[];
  private flows: FlowVar[];
  private auxes: AuxVar[];
  private evalOrder: Variable[];
  private evaluators: Map<string, Evaluator>;
  private overrides: Map<string, number> = new Map();

  constructor(model: Model) {
    this.model = model;
    this.stocks = model.variables.filter((v): v is StockVar => v.kind === 'stock');
    this.flows = model.variables.filter((v): v is FlowVar => v.kind === 'flow');
    this.auxes = model.variables.filter((v): v is AuxVar => v.kind === 'aux');

    const knownNames = new Set(model.variables.map((v) => v.name));
    knownNames.add('TIME');
    knownNames.add('time');

    // Normalize variable references in all expressions
    const allVarNames = model.variables.map((v) => v.name);
    const normalizeEqn = (eqn: string) => normalizeVarRefs(eqn, allVarNames);

    // Build evaluators for flows and auxes (stocks use their eqn as initial value only)
    this.evaluators = new Map();
    for (const v of [...this.flows, ...this.auxes]) {
      this.evaluators.set(v.name, makeEvaluator(normalizeEqn(v.eqn)));
    }

    // Topological order for auxes + flows (stocks are updated last)
    this.evalOrder = topoSort([...this.auxes, ...this.flows], knownNames);
  }

  setOverride(name: string, value: number): void {
    this.overrides.set(name, value);
  }

  clearOverride(name: string): void {
    this.overrides.delete(name);
  }

  simulate(): SimResults {
    const { timeStart, timeStop, dt } = this.model.meta;
    const steps = Math.round((timeStop - timeStart) / dt);

    // Initialize stocks
    const state: Record<string, number> = {};
    for (const s of this.stocks) {
      state[s.name] = this.overrides.has(s.name)
        ? this.overrides.get(s.name)!
        : parseFloat(s.eqn) || 0;
    }

    const times: number[] = [];
    const seriesData: Map<string, number[]> = new Map();
    for (const v of this.model.variables) seriesData.set(v.name, []);

    for (let i = 0; i <= steps; i++) {
      const time = timeStart + i * dt;
      times.push(time);

      // Build scope with current stocks + TIME
      const scope: Record<string, number> = { ...state, TIME: time, time };

      // Evaluate auxes and flows in dependency order
      for (const v of this.evalOrder) {
        if (this.overrides.has(v.name)) {
          scope[v.name] = this.overrides.get(v.name)!;
        } else {
          const eval_ = this.evaluators.get(v.name);
          scope[v.name] = eval_ ? eval_(scope) : 0;
        }
      }

      // Record all variable values for this timestep
      for (const v of this.model.variables) {
        seriesData.get(v.name)!.push(scope[v.name] ?? 0);
      }

      // Euler update stocks (not on the last step)
      if (i < steps) {
        for (const s of this.stocks) {
          const inflow = s.inflows.reduce((acc, name) => acc + (scope[name] ?? 0), 0);
          const outflow = s.outflows.reduce((acc, name) => acc + (scope[name] ?? 0), 0);
          const newVal = state[s.name] + (inflow - outflow) * dt;
          // Clamp at 0 to avoid negative stocks (physical minimum)
          state[s.name] = Math.max(0, newVal);
        }
      }
    }

    return { times, series: seriesData };
  }
}
