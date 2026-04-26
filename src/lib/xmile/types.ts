export type ControlSpec =
  | { kind: 'slider'; min: number; max: number; step: number; default: number }
  | { kind: 'toggle'; default: boolean }
  | { kind: 'chart' };

export interface StockVar {
  kind: 'stock';
  name: string;
  displayName: string;
  eqn: string;
  doc: string;
  units: string;
  inflows: string[];
  outflows: string[];
  control?: ControlSpec;
}

export interface FlowVar {
  kind: 'flow';
  name: string;
  displayName: string;
  eqn: string;
  doc: string;
  units: string;
  from?: string;
  to?: string;
  control?: ControlSpec;
}

export interface AuxVar {
  kind: 'aux';
  name: string;
  displayName: string;
  eqn: string;
  doc: string;
  units: string;
  control?: ControlSpec;
}

export type Variable = StockVar | FlowVar | AuxVar;

export interface ViewNode {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Points defining the flow line (for flows only) */
  pts?: Array<{ x: number; y: number }>;
}

export interface ViewConnector {
  uid: string;
  from: string;
  to: string;
  angle: number;
}

export interface ViewLayout {
  variables: Map<string, ViewNode>;
  connectors: ViewConnector[];
  /** Bounding box of all nodes */
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface ModelMeta {
  id: string;
  name: string;
  description: string;
  timeUnit: string;
  timeStart: number;
  timeStop: number;
  dt: number;
}

export interface Model {
  meta: ModelMeta;
  variables: Variable[];
  view: ViewLayout;
  rawXmile: string;
}

export interface ManifestEntry {
  id: string;
  title: string;
  subtitle: string;
  file: string;
  description_file?: string;
  difficulty?: string;
  tags?: string[];
}

export interface Manifest {
  models: ManifestEntry[];
}
