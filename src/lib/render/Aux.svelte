<script lang="ts">
  import type { AuxVar, ViewNode } from '../xmile/types.js';
  import { showTooltip, hideTooltip } from '../../stores/tooltip.js';

  let {
    variable,
    node,
    currentValue,
    isParam,
  }: {
    variable: AuxVar;
    node: ViewNode;
    currentValue?: number;
    isParam: boolean;
  } = $props();

  const R = 18;

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
  <circle
    cx={node.x}
    cy={node.y}
    r={R}
    class="transition-colors
      {isParam ? 'fill-violet-100 stroke-violet-500' : 'fill-slate-100 stroke-slate-400'}
      {isParam ? 'stroke-2' : 'stroke-[1.5]'}"
  />

  <!-- Slider icon for param variables -->
  {#if isParam}
    <circle
      cx={node.x}
      cy={node.y}
      r={R + 3}
      fill="none"
      stroke="#8b5cf6"
      stroke-width="1"
      stroke-dasharray="3 2"
      opacity="0.5"
    />
  {/if}

  <!-- Name -->
  <text
    x={node.x}
    y={node.y - (currentValue != null ? 5 : 0)}
    text-anchor="middle"
    dominant-baseline="middle"
    class="pointer-events-none select-none text-[9px] font-medium capitalize
      {isParam ? 'fill-violet-900' : 'fill-slate-700'}"
  >
    {variable.displayName.length > 10 ? variable.displayName.slice(0, 9) + '…' : variable.displayName}
  </text>

  {#if currentValue != null}
    <text
      x={node.x}
      y={node.y + 7}
      text-anchor="middle"
      dominant-baseline="middle"
      class="pointer-events-none select-none font-mono text-[8px]
        {isParam ? 'fill-violet-700' : 'fill-slate-500'}"
    >
      {fmt(currentValue)}
    </text>
  {/if}
</g>
