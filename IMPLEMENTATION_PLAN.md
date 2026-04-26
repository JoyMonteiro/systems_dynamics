# Implementation Plan: System Dynamics Game

A static, single-page web app deployed to GitHub Pages that lets students load and play with system dynamics models authored in simlin. Players toggle flows on and off, adjust parameters via sliders, run the simulation, and watch stocks evolve over time on synchronized charts. The model diagram renders read-only with tooltips on every variable.

## Goals and constraints

- Pure static deploy, no backend
- Designer-to-deploy pipeline that does not require the designer to write code
- Clean separation: simlin owns model authoring; this app owns presentation and player interaction
- One game shell, many models
- Bundle target: under 1 MB after gzip

## Architecture at a glance

```
┌─────────────────────────────────────────────────────┐
│  GitHub Pages (static hosting)                       │
│                                                       │
│  ┌─────────────┐    ┌──────────────────────────┐    │
│  │ index.html  │ ── │  Bundled SPA              │    │
│  └─────────────┘    │  - UI shell (Svelte)      │    │
│                     │  - XMILE parser           │    │
│                     │  - Diagram renderer (SVG) │    │
│                     │  - Chart layer            │    │
│                     │  - simlin engine (WASM)   │    │
│                     └──────────────────────────┘    │
│                              │                       │
│                              ▼                       │
│                     ┌──────────────────────┐        │
│                     │ /models/             │        │
│                     │   index.json         │        │
│                     │   borewell.xmile     │        │
│                     │   borewell.md        │        │
│                     │   reservoir.xmile    │        │
│                     │   ...                │        │
│                     └──────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

Runtime flow: page loads → fetch `/models/index.json` → render model picker → user picks a model → fetch `<name>.xmile` and optional `<name>.md` → parse, render diagram, instantiate simulation engine → present controls and charts → run simulation on demand.

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Build tool | Vite | Fast dev, simple SPA output, GH Pages friendly |
| UI framework | Svelte 5 | Lightweight, fast iteration, small bundles |
| Language | TypeScript | Pays for itself once the XMILE parser exists |
| Styling | Tailwind CSS | Fast styling, small with purge |
| XML parsing | fast-xml-parser | Small, mature, configurable |
| Simulation | simlin WASM engine | Battle-tested, handles unit conversion and edge cases |
| Diagram | Hand-rolled SVG | Full control, ~300 lines |
| Charts | uPlot (or visx if React) | Polished, fast, tree-shakeable |
| Hosting | GitHub Pages | Free, integrates with the designer's workflow |

**One package to verify before starting:** the simlin WASM engine. Check the simlin repo (https://github.com/bpowers/simlin) for the current published npm package and version. If a clean published package isn't available, build from source per their README — it's WebAssembly produced from their Rust engine, so the build is one-time and outputs a `.wasm` plus a small JS shim.

If you prefer React over Svelte, the architecture is identical — swap uPlot for visx and the renderer components from `.svelte` to `.tsx`. Everything below is framework-agnostic in spirit.

## Repository structure

```
sd-game/
├── README.md
├── DESIGNER_MANUAL.md
├── IMPLEMENTATION_PLAN.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── public/
│   └── models/
│       ├── index.json
│       ├── borewell.xmile
│       ├── borewell.md
│       └── ...
├── src/
│   ├── main.ts
│   ├── App.svelte
│   ├── lib/
│   │   ├── xmile/
│   │   │   ├── parse.ts
│   │   │   ├── conventions.ts
│   │   │   └── types.ts
│   │   ├── sim/
│   │   │   ├── engine.ts
│   │   │   └── runner.ts
│   │   ├── render/
│   │   │   ├── Diagram.svelte
│   │   │   ├── Stock.svelte
│   │   │   ├── Flow.svelte
│   │   │   ├── Aux.svelte
│   │   │   └── Connector.svelte
│   │   ├── chart/
│   │   │   └── TimeSeries.svelte
│   │   └── ui/
│   │       ├── ModelPicker.svelte
│   │       ├── ControlPanel.svelte
│   │       └── Tooltip.svelte
│   └── stores/
│       ├── model.ts
│       ├── controls.ts
│       └── results.ts
└── .github/workflows/
    └── deploy.yml
```

## The model manifest

`public/models/index.json` is the single source of truth listing all available models. The designer maintains it.

```json
{
  "models": [
    {
      "id": "borewell",
      "title": "The Borewell Game",
      "subtitle": "What happens when everyone drills a little deeper?",
      "file": "borewell.xmile",
      "description_file": "borewell.md",
      "difficulty": "intermediate",
      "tags": ["water", "commons", "feedback"]
    }
  ]
}
```

The app fetches this on load and renders the picker. Each model file is fetched lazily when the user selects it. The `description_file` field is optional.

A v2 enhancement: replace the manifest with a runtime call to the GitHub Contents API (`/repos/{owner}/{repo}/contents/public/models`) to auto-discover files. 60 unauthenticated requests per hour is plenty for a teaching context, and the designer no longer maintains the manifest at all. Worth it once the project stabilizes.

## XMILE parsing

XMILE is the standard SD interchange format (XML-based). simlin exports clean XMILE. The parser produces an internal model AST:

```ts
type Model = {
  meta: {
    id: string;
    name: string;
    description: string;
    timeUnit: string;
    timeStart: number;
    timeStop: number;
    dt: number;
  };
  variables: Variable[];
  view: ViewLayout;
  rawXmile: string;  // kept for re-feeding to simlin engine
};

type Variable =
  | { kind: 'stock'; name: string; eqn: string; doc: string; units: string;
      inflows: string[]; outflows: string[]; control?: ControlSpec }
  | { kind: 'flow'; name: string; eqn: string; doc: string; units: string;
      from?: string; to?: string; control?: ControlSpec }
  | { kind: 'aux'; name: string; eqn: string; doc: string; units: string;
      control?: ControlSpec };

type ControlSpec =
  | { kind: 'slider'; min: number; max: number; step: number; default: number }
  | { kind: 'toggle'; default: boolean }
  | { kind: 'chart' };

type ViewLayout = {
  variables: Map<string, { x: number; y: number; w: number; h: number }>;
  connectors: Array<{ from: string; to: string; angle: number }>;
};
```

Use fast-xml-parser configured to preserve attributes. Walk the parsed tree and project into the AST.

Pitfalls:
- XMILE allows variables to be defined inside modules and arrayed across subscripts. For v1, detect these and refuse to load the model with a clear error message. Add support later.
- Equations contain references that must match variable names exactly, including case. simlin normalizes these on export, but worth a sanity-check pass.
- Some XMILE producers omit the `<view>` section. simlin always includes it. If your code ever has to load non-simlin XMILE (Vensim, Stella exports), fall back to an auto-layout algorithm (e.g. dagre).

## Naming conventions for player controls

The designer signals which variables are player-facing through name prefixes. The parser converts these into ControlSpecs.

| Prefix | Variable type | Becomes |
|---|---|---|
| `param_<name>` | auxiliary | Slider in the control panel |
| `toggle_<name>` | flow | On/off button (when off, flow value = 0) |
| `chart_<name>` | stock or aux | Forced onto the default chart view |

For sliders, min/max/default are read from the XMILE `<range>` element on the auxiliary, which the designer sets in simlin's variable detail panel. If `<range>` is absent, fall back to `[0, 2 × current_value]` and log a warning to the console — this is almost never what the designer wants, but it prevents a hard error.

For toggles, the runner overrides the flow's value to 0 when the toggle is off:

```ts
function applyControls(engine: Engine, controls: ControlState) {
  for (const [name, value] of controls.params) {
    engine.setOverride(name, value);
  }
  for (const [name, isOn] of controls.toggles) {
    if (!isOn) engine.setOverride(name, 0);
  }
}
```

(Verify the exact override API in the simlin engine package.)

**Why prefixes over structured doc fields?** I considered using `@control: slider min=0 max=100` syntax inside the doc field. That keeps variable names clean. But prefixes have one decisive advantage: when the designer reviews their own model in simlin's diagram view, the player-facing surface is visible at a glance. That's worth more than aesthetic neutrality. Pick one convention and commit; do not support both.

## Diagram rendering

Read `view.variables` for coordinates from XMILE. Render each variable into SVG:

- **Stock**: rounded rectangle, name centered, current value (during sim) below the name in a smaller font
- **Flow**: line from source to target, "valve" circle at midpoint, arrowhead at target end, name and value next to the valve
- **Auxiliary**: small circle, name and value
- **Cloud** (source/sink for flows that originate or terminate "outside" the system): small cloud icon
- **Connector** (information arrow between variables): curved line with small arrowhead, no label

All shapes get pointer handlers that fire `tooltip.show(variable, mousePosition)`.

Set `viewBox` to bound the diagram tightly with a margin. Add zoom and pan via wheel and drag. Don't bother with anything more sophisticated — read-only diagrams don't need editing affordances.

Polish levers worth the effort:
- Curved flow lines (Bezier with a slight midpoint nudge, not straight lines)
- Arrowhead defs as a reusable `<marker>`
- Subtle drop shadow on stocks (CSS filter, not SVG filter)
- Color-code by role: stocks one shade, flows another, auxes a third
- Highlight player-controlled variables with a subtle outline so students see what they can change before hovering
- Animate stock fill levels when a stock has a finite capacity in its range — turns the rectangle into a tiny gauge

## Simulation integration

simlin's WASM engine, conceptually, exposes:

- `Engine.fromXmile(xml: string): Engine` — parse a model
- `engine.simulate(): SimResults` — run with current overrides
- `engine.setOverride(name: string, value: number): void` — override a variable for the next run
- `results.series(name: string): number[]` — time series for one variable
- `results.times(): number[]` — the time axis

Verify exact method names against the published package — the names above are illustrative.

The runner module:

```ts
function runSimulation(model: Model, controls: ControlState): SimResults {
  const engine = Engine.fromXmile(model.rawXmile);
  applyControls(engine, controls);
  return engine.simulate();
}
```

Re-run on every control change, debounced ~100ms. For models with under 50 variables and under 500 timesteps, this is sub-10ms — feels instant.

Cache the parsed engine if instantiation turns out to be expensive — keep one engine per loaded model, call `setOverride` and `simulate` repeatedly without re-parsing.

## Charts

A single `<TimeSeries>` component accepts an array of variable names and the SimResults. Renders one line per variable, color-matched to the diagram. Synchronized vertical cursor; hover shows value at that timestep.

Two views worth building:
1. **Live view**: shows the current run.
2. **Comparison overlay**: keeps the last 2-3 runs at progressively lower opacity, so the student can see the consequences of toggling a flow or moving a slider without losing the previous trajectory. This is what makes the game feel like a *game* rather than a viewer.

uPlot is fast and stark; spend an hour on typography, gridline color, and tooltip styling and it looks polished.

## Tooltip system

Single global Tooltip component, positioned absolutely, controlled by a Svelte store. Diagram elements fire `tooltip.show(variable, position)` on hover, `tooltip.hide()` on leave. The tooltip reads from the parsed model:

```
┌─────────────────────────────┐
│ rainfall                     │
│ Precipitation entering       │
│ the system per month         │
│                              │
│ Units: mm/month              │
│ Current: 42.3                │
└─────────────────────────────┘
```

The "Current" line is live — pull from the latest simulation results at the current chart cursor position.

## Build and deploy

`vite.config.ts`: set `base: '/<repo-name>/'` for GitHub Pages subpath hosting; set `build.outDir: 'dist'`.

`.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

Enable Pages in repo settings → source: GitHub Actions. Every push to `main` rebuilds and deploys. Crucially, this means when the designer adds a model file via the GitHub web UI, deployment is automatic — no manual step.

## Implementation phases

| Phase | Scope | Estimate |
|---|---|---|
| 1. Skeleton | Vite + Svelte + Tailwind set up. Hardcoded model loaded from `/public/models/`. XMILE parser produces the AST. JSON dump as the only UI. GH Pages deploy working. | 1-2 days |
| 2. Simulation | simlin engine integrated. "Run" button → results displayed as numbers. One stock plotted on a chart. | 1-2 days |
| 3. Diagram | SVG renderer for stocks, flows, auxes, connectors. Tooltips on hover. Live values inside diagram during simulation. | 2-3 days |
| 4. Controls | Convention parser produces ControlSpecs. Slider and toggle UI components. Wired into simulation overrides. Debounced re-simulation. | 1-2 days |
| 5. Model loading | `index.json` manifest. Model picker UI. Sidecar `.md` description rendering. | 1 day |
| 6. Polish | Multi-line charts with synchronized cursors. Run-comparison overlay. Diagram color-coding and hover states. Designer testing with a real authored model. | 2-3 days |

Total: roughly 8-13 working days for a polished v1.

## Testing

- Unit-test the XMILE parser against fixtures (a borewell model, a model with clouds, a model with arrayed variables you'll skip-and-warn on)
- Snapshot-test the diagram renderer (SVG output should be deterministic given the same model)
- Manual checklist for each new model: opens correctly, all variables have docs, controls appear, simulation runs without errors, tooltip values are correct
- Lighthouse run on deploy: bundle size, accessibility, performance

## Known gotchas

- **Number formatting:** SD models can have wildly different magnitudes (millimeters vs gigatonnes). Use units field to pick a formatter — at minimum, switch between fixed-decimal and scientific notation based on absolute value.
- **Mobile layout:** stock-flow diagrams are intrinsically 2D and hard to shrink. Plan for tablet (portrait) as the realistic minimum; show a friendly "best on a larger screen" notice on phone.
- **Initial values vs equations:** stocks have an initial value separate from their inflow/outflow equations. Make sure the parser captures both — `<eqn>` for initial value, `<inflow>`/`<outflow>` for rates. simlin's XMILE export is clean about this; non-simlin XMILE less so.
- **Subscripted/arrayed models:** simlin supports them but your renderer initially won't. Detect via `<dimensions>` element and refuse to load with a clear message rather than silently breaking.
- **Equation editing:** explicitly out of scope. Students cannot edit equations. If you find yourself building this, you've slipped into making an editor — use simlin instead.
