<script lang="ts">
  import type { Model, Variable } from '../xmile/types.js';
  import type { SimResults } from '../sim/engine.js';
  import Stock from './Stock.svelte';
  import Flow from './Flow.svelte';
  import Aux from './Aux.svelte';
  import Connector from './Connector.svelte';

  let {
    model,
    latestResults,
    toggleStates,
    cursorTimeIdx,
  }: {
    model: Model;
    latestResults?: SimResults;
    toggleStates: Map<string, boolean>;
    cursorTimeIdx: number;
  } = $props();

  const PAD = 60;

  const { view, variables } = $derived(model);
  const { bbox } = $derived(view);

  const vbX = $derived(bbox.minX - PAD);
  const vbY = $derived(bbox.minY - PAD);
  const vbW = $derived(bbox.maxX - bbox.minX + PAD * 2);
  const vbH = $derived(bbox.maxY - bbox.minY + PAD * 2);

  // Pan & zoom state
  let pan = $state({ x: 0, y: 0 });
  let scale = $state(1);
  let dragging = $state(false);
  let dragStart = $state({ x: 0, y: 0 });

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.3, Math.min(4, scale * delta));
  }

  function onMouseDown(e: MouseEvent) {
    dragging = true;
    dragStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    pan = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
  }

  function onMouseUp() { dragging = false; }

  function currentVal(varName: string): number | undefined {
    if (!latestResults) return undefined;
    const series = latestResults.series.get(varName);
    return series?.[cursorTimeIdx];
  }

  function isChart(v: Variable): boolean {
    return v.control?.kind === 'chart';
  }

  function isParam(v: Variable): boolean {
    return v.control?.kind === 'slider';
  }

  function isToggle(v: Variable): boolean {
    return v.control?.kind === 'toggle';
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 cursor-grab select-none {dragging ? 'cursor-grabbing' : ''}"
  onwheel={onWheel}
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
>
  <svg
    class="h-full w-full"
    viewBox="{vbX} {vbY} {vbW} {vbH}"
    style="transform: translate({pan.x}px, {pan.y}px) scale({scale}); transform-origin: center"
  >
    <!-- Connectors drawn first (below everything) -->
    {#each view.connectors as conn (conn.uid)}
      <Connector connector={conn} nodes={view.variables} />
    {/each}

    <!-- Flows -->
    {#each variables as v}
      {#if v.kind === 'flow'}
        {@const node = view.variables.get(v.name)}
        {#if node}
          <Flow
            variable={v}
            {node}
            fromNode={v.from ? view.variables.get(v.from) : undefined}
            toNode={v.to ? view.variables.get(v.to) : undefined}
            isToggle={isToggle(v)}
            isOn={isToggle(v) ? (toggleStates.get(v.name) ?? true) : true}
            currentValue={currentVal(v.name)}
          />
        {/if}
      {/if}
    {/each}

    <!-- Auxiliaries -->
    {#each variables as v}
      {#if v.kind === 'aux'}
        {@const node = view.variables.get(v.name)}
        {#if node}
          <Aux variable={v} {node} currentValue={currentVal(v.name)} isParam={isParam(v)} />
        {/if}
      {/if}
    {/each}

    <!-- Stocks (drawn last, on top) -->
    {#each variables as v}
      {#if v.kind === 'stock'}
        {@const node = view.variables.get(v.name)}
        {#if node}
          <Stock variable={v} {node} currentValue={currentVal(v.name)} isChart={isChart(v)} />
        {/if}
      {/if}
    {/each}
  </svg>

  <!-- Hint -->
  <div class="pointer-events-none absolute bottom-2 right-3 text-xs text-slate-400">
    Scroll to zoom · Drag to pan
  </div>
</div>
