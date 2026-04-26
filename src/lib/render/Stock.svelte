<script lang="ts">
  import type { StockVar } from '../xmile/types.js';
  import type { ViewNode } from '../xmile/types.js';
  import { showTooltip, hideTooltip } from '../../stores/tooltip.js';

  let {
    variable,
    node,
    currentValue,
    isChart,
  }: {
    variable: StockVar;
    node: ViewNode;
    currentValue?: number;
    isChart: boolean;
  } = $props();

  const W = $derived(node.w || 80);
  const H = $derived(node.h || 40);
  const x = $derived(node.x - W / 2);
  const y = $derived(node.y - H / 2);

  function fmt(v: number | undefined): string {
    if (v == null) return '';
    if (Math.abs(v) >= 1e4 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
    return v % 1 === 0 ? v.toString() : v.toFixed(1);
  }
</script>

<g
  class="cursor-pointer"
  onmouseenter={(e) => showTooltip(variable, e.clientX, e.clientY, currentValue)}
  onmouseleave={hideTooltip}
  onmousemove={(e) => showTooltip(variable, e.clientX, e.clientY, currentValue)}
  role="img"
  aria-label={variable.displayName}
>
  <!-- Drop shadow filter is applied via CSS class on the rect -->
  <rect
    {x}
    {y}
    width={W}
    height={H}
    rx="6"
    class="fill-blue-100 stroke-blue-500 transition-colors hover:fill-blue-200
      {isChart ? 'stroke-2' : 'stroke-[1.5]'}"
    style="filter: drop-shadow(0 2px 4px rgba(29,78,216,0.15))"
  />

  <!-- Fill gauge when currentValue is available and stock has max range -->
  {#if currentValue != null}
    <rect
      x={x + 2}
      y={y + H - 2 - Math.max(0, Math.min(H - 4, ((H - 4) * currentValue) / Math.max(currentValue, 1)))}
      width={W - 4}
      height={Math.max(0, Math.min(H - 4, ((H - 4) * currentValue) / Math.max(currentValue, 1)))}
      rx="4"
      class="fill-blue-300 opacity-50 transition-all"
    />
  {/if}

  <!-- Name -->
  <text
    x={node.x}
    y={node.y - (currentValue != null ? 6 : 0)}
    text-anchor="middle"
    dominant-baseline="middle"
    class="pointer-events-none select-none fill-blue-900 text-[11px] font-semibold capitalize"
  >
    {variable.displayName}
  </text>

  <!-- Live value -->
  {#if currentValue != null}
    <text
      x={node.x}
      y={node.y + 9}
      text-anchor="middle"
      dominant-baseline="middle"
      class="pointer-events-none select-none fill-blue-700 text-[9px] font-mono"
    >
      {fmt(currentValue)}
    </text>
  {/if}

  <!-- Chart indicator ring -->
  {#if isChart}
    <rect
      x={x - 2}
      y={y - 2}
      width={W + 4}
      height={H + 4}
      rx="8"
      class="fill-none stroke-blue-400 stroke-1 opacity-60"
      stroke-dasharray="4 3"
    />
  {/if}
</g>
