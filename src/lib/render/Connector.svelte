<script lang="ts">
  import type { ViewConnector, ViewNode } from '../xmile/types.js';

  let { connector, nodes }: { connector: ViewConnector; nodes: Map<string, ViewNode> } = $props();

  const from = $derived(nodes.get(connector.from));
  const to = $derived(nodes.get(connector.to));

  // Curved connector using a quadratic Bezier
  const path = $derived(computePath(from, to));

  function computePath(
    f?: ViewNode,
    t?: ViewNode,
  ): string {
    if (!f || !t) return '';
    // Nudge control point perpendicular to the midpoint for a slight curve
    const mx = (f.x + t.x) / 2;
    const my = (f.y + t.y) / 2;
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const curve = 25;
    const cx = mx + nx * curve;
    const cy = my + ny * curve;
    return `M ${f.x} ${f.y} Q ${cx} ${cy} ${t.x} ${t.y}`;
  }

  // Arrowhead at destination
  const arrow = $derived(computeArrow(from, to));

  function computeArrow(f?: ViewNode, t?: ViewNode) {
    if (!f || !t) return null;
    const mx = (f.x + t.x) / 2;
    const my = (f.y + t.y) / 2;
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const curve = 25;
    const cx = mx + nx * curve;
    const cy = my + ny * curve;
    // Direction at endpoint: tangent of quadratic bezier at t=1
    const ux = t.x - cx;
    const uy = t.y - cy;
    const ulen = Math.sqrt(ux * ux + uy * uy) || 1;
    const tx = ux / ulen;
    const ty = uy / ulen;
    const sz = 7;
    const tip = { x: t.x, y: t.y };
    return {
      tip,
      left: { x: tip.x - sz * tx + (sz / 2) * ty, y: tip.y - sz * ty - (sz / 2) * tx },
      right: { x: tip.x - sz * tx - (sz / 2) * ty, y: tip.y - sz * ty + (sz / 2) * tx },
    };
  }
</script>

{#if from && to}
  <path
    d={path}
    fill="none"
    stroke="#94a3b8"
    stroke-width="1.5"
    class="pointer-events-none"
  />
  {#if arrow}
    <polygon
      points="{arrow.tip.x},{arrow.tip.y} {arrow.left.x},{arrow.left.y} {arrow.right.x},{arrow.right.y}"
      fill="#94a3b8"
      class="pointer-events-none"
    />
  {/if}
{/if}
