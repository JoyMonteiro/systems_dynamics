<script lang="ts">
  import type { FlowVar, ViewNode } from '../xmile/types.js';
  import { showTooltip, hideTooltip } from '../../stores/tooltip.js';

  let {
    variable,
    node,
    fromNode,
    toNode,
    isToggle,
    isOn,
    currentValue,
  }: {
    variable: FlowVar;
    node: ViewNode;
    fromNode?: ViewNode;
    toNode?: ViewNode;
    isToggle: boolean;
    isOn: boolean;
    currentValue?: number;
  } = $props();

  // Compute line endpoints from pts (preferred) or from connected nodes
  const pts = $derived(
    node.pts ??
      computeDefaultPts(node, fromNode, toNode),
  );

  function computeDefaultPts(
    valve: ViewNode,
    from?: ViewNode,
    to?: ViewNode,
  ): Array<{ x: number; y: number }> {
    const start = from
      ? { x: from.x + (from.w || 80) / 2, y: from.y }
      : { x: valve.x - 80, y: valve.y };
    const end = to
      ? { x: to.x - (to.w || 80) / 2, y: to.y }
      : { x: valve.x + 80, y: valve.y };
    return [start, end];
  }

  const lineColor = $derived(isOn ? '#0369a1' : '#94a3b8');
  const valveColor = $derived(isOn ? '#0ea5e9' : '#94a3b8');

  function polyline(points: Array<{ x: number; y: number }>): string {
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  }

  // Arrowhead at the last segment
  const arrow = $derived(computeArrow(pts));

  function computeArrow(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return null;
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const sz = 8;
    return {
      tip: last,
      left: { x: last.x - sz * ux + (sz / 2) * uy, y: last.y - sz * uy - (sz / 2) * ux },
      right: { x: last.x - sz * ux - (sz / 2) * uy, y: last.y - sz * uy + (sz / 2) * ux },
    };
  }

  function fmt(v: number | undefined): string {
    if (v == null) return '';
    if (Math.abs(v) >= 1e4) return v.toExponential(1);
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
  <!-- Flow pipe line -->
  <polyline
    points={polyline(pts)}
    fill="none"
    stroke={lineColor}
    stroke-width="2"
    stroke-dasharray={isOn ? 'none' : '5 4'}
    class="transition-all"
  />

  <!-- Arrowhead -->
  {#if arrow}
    <polygon
      points="{arrow.tip.x},{arrow.tip.y} {arrow.left.x},{arrow.left.y} {arrow.right.x},{arrow.right.y}"
      fill={lineColor}
      class="transition-colors"
    />
  {/if}

  <!-- Valve circle -->
  <circle
    cx={node.x}
    cy={node.y}
    r="10"
    fill={valveColor}
    stroke="white"
    stroke-width="2"
    class="transition-colors"
  />
  <!-- Valve symbol: cross (open) or X (closed) -->
  {#if isOn}
    <line x1={node.x - 5} y1={node.y} x2={node.x + 5} y2={node.y} stroke="white" stroke-width="2" />
    <line x1={node.x} y1={node.y - 5} x2={node.x} y2={node.y + 5} stroke="white" stroke-width="2" />
  {:else}
    <line x1={node.x - 4} y1={node.y - 4} x2={node.x + 4} y2={node.y + 4} stroke="white" stroke-width="2" />
    <line x1={node.x + 4} y1={node.y - 4} x2={node.x - 4} y2={node.y + 4} stroke="white" stroke-width="2" />
  {/if}

  <!-- Cloud at start (source) -->
  {#if !fromNode}
    <g transform="translate({pts[0].x - 14},{pts[0].y - 10})">
      <ellipse cx="14" cy="10" rx="14" ry="10" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
      <ellipse cx="6" cy="12" rx="7" ry="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
      <ellipse cx="22" cy="12" rx="7" ry="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
      <rect x="0" y="12" width="28" height="8" fill="#e2e8f0" />
    </g>
  {/if}

  <!-- Cloud at end (sink) -->
  {#if !toNode}
    {@const ep = pts[pts.length - 1]}
    <g transform="translate({ep.x - 14},{ep.y - 10})">
      <ellipse cx="14" cy="10" rx="14" ry="10" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
      <ellipse cx="6" cy="12" rx="7" ry="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
      <ellipse cx="22" cy="12" rx="7" ry="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
      <rect x="0" y="12" width="28" height="8" fill="#e2e8f0" />
    </g>
  {/if}

  <!-- Name label next to valve -->
  <text
    x={node.x + 14}
    y={node.y - 14}
    text-anchor="start"
    class="pointer-events-none select-none text-[9px] capitalize"
    fill={isOn ? '#0369a1' : '#94a3b8'}
  >
    {variable.displayName}
    {#if currentValue != null}
      <tspan class="text-[8px]"> ({fmt(currentValue)})</tspan>
    {/if}
  </text>
</g>
