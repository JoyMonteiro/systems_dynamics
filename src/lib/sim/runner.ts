import type { Model } from '../xmile/types.js';
import { Engine, type SimResults } from './engine.js';

export type ControlState = {
  params: Map<string, number>;
  toggles: Map<string, boolean>;
};

export function runSimulation(model: Model, controls: ControlState): SimResults {
  const engine = new Engine(model);

  for (const [name, value] of controls.params) {
    engine.setOverride(name, value);
  }
  for (const [name, isOn] of controls.toggles) {
    if (!isOn) engine.setOverride(name, 0);
  }

  return engine.simulate();
}
