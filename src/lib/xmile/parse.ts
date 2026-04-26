import { XMLParser } from 'fast-xml-parser';
import type {
  Model,
  ModelMeta,
  Variable,
  StockVar,
  FlowVar,
  AuxVar,
  ViewLayout,
  ViewNode,
  ViewConnector,
} from './types.js';
import { normalizeName, stripPrefix, controlSpecFromConvention } from './conventions.js';

const ALWAYS_ARRAY = new Set([
  'inflow',
  'outflow',
  'stock',
  'flow',
  'aux',
  'connector',
  'pt',
  'model',
  'view',
]);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ALWAYS_ARRAY.has(name),
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v).trim();
}

function parseInOutFlows(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((r) => normalizeName(str(r)));
  return [normalizeName(str(raw))];
}

// ---------------------------------------------------------------------------
// Variable parsers
// ---------------------------------------------------------------------------

function parseRange(raw: unknown): { min?: number; max?: number; step?: number } {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  return {
    min: r['@_min'] != null ? num(r['@_min']) : undefined,
    max: r['@_max'] != null ? num(r['@_max']) : undefined,
    step: r['@_step'] != null ? num(r['@_step']) : undefined,
  };
}

function parseStock(raw: Record<string, unknown>): StockVar {
  const rawName = str(raw['@_name']);
  const name = normalizeName(rawName);
  const eqn = str(raw['eqn']);
  const defaultValue = num(eqn, 0);
  const range = parseRange(raw['range']);
  const control = controlSpecFromConvention(
    'stock',
    name,
    range.min,
    range.max,
    range.step,
    defaultValue,
  );
  return {
    kind: 'stock',
    name,
    displayName: stripPrefix(rawName).replace(/_/g, ' '),
    eqn,
    doc: str(raw['doc']),
    units: str(raw['units']),
    inflows: parseInOutFlows(raw['inflow']),
    outflows: parseInOutFlows(raw['outflow']),
    control,
  };
}

function parseFlow(raw: Record<string, unknown>): FlowVar {
  const rawName = str(raw['@_name']);
  const name = normalizeName(rawName);
  const control = controlSpecFromConvention('flow', name);
  return {
    kind: 'flow',
    name,
    displayName: stripPrefix(rawName).replace(/_/g, ' '),
    eqn: str(raw['eqn']),
    doc: str(raw['doc']),
    units: str(raw['units']),
    control,
  };
}

function parseAux(raw: Record<string, unknown>): AuxVar {
  const rawName = str(raw['@_name']);
  const name = normalizeName(rawName);
  const eqn = str(raw['eqn']);
  const defaultValue = num(eqn, 0);
  const range = parseRange(raw['range']);
  const control = controlSpecFromConvention(
    'aux',
    name,
    range.min,
    range.max,
    range.step,
    defaultValue,
  );
  return {
    kind: 'aux',
    name,
    displayName: stripPrefix(rawName).replace(/_/g, ' '),
    eqn,
    doc: str(raw['doc']),
    units: str(raw['units']),
    control,
  };
}

// ---------------------------------------------------------------------------
// View parser
// ---------------------------------------------------------------------------

const STOCK_W = 80;
const STOCK_H = 40;
const AUX_R = 20;

function parsePts(flowRaw: Record<string, unknown>): Array<{ x: number; y: number }> | undefined {
  const ptsNode = flowRaw['pts'];
  if (!ptsNode || typeof ptsNode !== 'object') return undefined;
  const pts = (ptsNode as Record<string, unknown>)['pt'];
  if (!pts) return undefined;
  const arr = Array.isArray(pts) ? pts : [pts];
  return arr.map((p) => ({ x: num((p as Record<string, unknown>)['@_x']), y: num((p as Record<string, unknown>)['@_y']) }));
}

function parseView(viewRaw: Record<string, unknown>, variables: Variable[]): ViewLayout {
  const nodes = new Map<string, ViewNode>();

  // Stocks
  const stocks = (viewRaw['stock'] as Record<string, unknown>[] | undefined) ?? [];
  for (const s of stocks) {
    const name = normalizeName(str(s['@_name']));
    const w = s['@_width'] != null ? num(s['@_width']) : STOCK_W;
    const h = s['@_height'] != null ? num(s['@_height']) : STOCK_H;
    nodes.set(name, { name, x: num(s['@_x']), y: num(s['@_y']), w, h });
  }

  // Flows — position is the valve midpoint
  const flows = (viewRaw['flow'] as Record<string, unknown>[] | undefined) ?? [];
  for (const f of flows) {
    const name = normalizeName(str(f['@_name']));
    const pts = parsePts(f);
    nodes.set(name, { name, x: num(f['@_x']), y: num(f['@_y']), w: 12, h: 12, pts });
  }

  // Auxiliaries
  const auxes = (viewRaw['aux'] as Record<string, unknown>[] | undefined) ?? [];
  for (const a of auxes) {
    const name = normalizeName(str(a['@_name']));
    nodes.set(name, { name, x: num(a['@_x']), y: num(a['@_y']), w: AUX_R * 2, h: AUX_R * 2 });
  }

  // Connectors
  const connRaw = (viewRaw['connector'] as Record<string, unknown>[] | undefined) ?? [];
  const connectors: ViewConnector[] = connRaw.map((c) => ({
    uid: str(c['@_uid']),
    from: normalizeName(str(c['@_from'])),
    to: normalizeName(str(c['@_to'])),
    angle: num(c['@_angle'], 0),
  }));

  // Wire flow from/to using stock inflow/outflow lists
  for (const v of variables) {
    if (v.kind === 'stock') {
      for (const inName of v.inflows) {
        const flowV = variables.find((x) => x.name === inName) as FlowVar | undefined;
        if (flowV) { flowV.to = v.name; }
      }
      for (const outName of v.outflows) {
        const flowV = variables.find((x) => x.name === outName) as FlowVar | undefined;
        if (flowV) { flowV.from = v.name; }
      }
    }
  }

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes.values()) {
    minX = Math.min(minX, node.x - node.w / 2);
    minY = Math.min(minY, node.y - node.h / 2);
    maxX = Math.max(maxX, node.x + node.w / 2);
    maxY = Math.max(maxY, node.y + node.h / 2);
    if (node.pts) {
      for (const pt of node.pts) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
  }

  return {
    variables: nodes,
    connectors,
    bbox: { minX, minY, maxX, maxY },
  };
}

// ---------------------------------------------------------------------------
// Top-level parse
// ---------------------------------------------------------------------------

export function parseXmile(xml: string, modelId = 'model'): Model {
  const doc = xmlParser.parse(xml) as Record<string, unknown>;
  const root = (doc['xmile'] ?? doc['XMILE']) as Record<string, unknown>;
  if (!root) throw new Error('Not a valid XMILE document');

  const header = (root['header'] ?? {}) as Record<string, unknown>;
  const simSpecs = (root['sim_specs'] ?? {}) as Record<string, unknown>;

  // Models can be at xmile.model or xmile.model[0]
  const modelNode = Array.isArray(root['model'])
    ? (root['model'][0] as Record<string, unknown>)
    : ((root['model'] ?? {}) as Record<string, unknown>);

  const varNode = (modelNode['variables'] ?? {}) as Record<string, unknown>;

  // Detect subscripted/arrayed variables
  if (varNode['dimension'] || varNode['dimensions']) {
    throw new Error('This model uses subscripted variables, which are not yet supported.');
  }

  const stockRaws = (varNode['stock'] as Record<string, unknown>[] | undefined) ?? [];
  const flowRaws = (varNode['flow'] as Record<string, unknown>[] | undefined) ?? [];
  const auxRaws = (varNode['aux'] as Record<string, unknown>[] | undefined) ?? [];

  const variables: Variable[] = [
    ...stockRaws.map(parseStock),
    ...flowRaws.map(parseFlow),
    ...auxRaws.map(parseAux),
  ];

  const viewsNode = (modelNode['views'] ?? {}) as Record<string, unknown>;
  const viewRaws = (viewsNode['view'] as Record<string, unknown>[] | undefined) ?? [];
  const viewRaw = viewRaws[0] ?? {};
  const view = parseView(viewRaw as Record<string, unknown>, variables);

  const dt = num(simSpecs['dt'], 0.25);

  const meta: ModelMeta = {
    id: modelId,
    name: str(header['name'], 'Untitled Model'),
    description: str(header['description']),
    timeUnit: str(simSpecs['time_units'], 'Time'),
    timeStart: num(simSpecs['start'], 0),
    timeStop: num(simSpecs['stop'], 100),
    dt,
  };

  return { meta, variables, view, rawXmile: xml };
}
