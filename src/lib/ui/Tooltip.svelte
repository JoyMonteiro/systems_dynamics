<script lang="ts">
  import { tooltip } from '../../stores/tooltip.js';

  function fmt(v: number | undefined): string {
    if (v == null) return '—';
    if (Math.abs(v) >= 1e5 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(3);
    return v % 1 === 0 ? v.toString() : v.toFixed(3);
  }

  const OFFSET = 14;
</script>

{#if $tooltip}
  {@const t = $tooltip}
  <div
    class="pointer-events-none fixed z-50 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-sm"
    style="left: {t.x + OFFSET}px; top: {t.y + OFFSET}px"
  >
    <div class="mb-0.5 font-semibold text-slate-800 capitalize">{t.variable.displayName}</div>
    {#if t.variable.doc}
      <p class="text-xs leading-snug text-slate-500">{t.variable.doc}</p>
    {/if}
    <div class="mt-2 border-t border-slate-100 pt-2 flex flex-col gap-0.5">
      {#if t.variable.units}
        <div class="flex justify-between text-xs">
          <span class="text-slate-400">Units</span>
          <span class="font-mono text-slate-600">{t.variable.units}</span>
        </div>
      {/if}
      {#if t.currentValue != null}
        <div class="flex justify-between text-xs">
          <span class="text-slate-400">Current</span>
          <span class="font-mono text-blue-700">{fmt(t.currentValue)}</span>
        </div>
      {/if}
      <div class="flex justify-between text-xs">
        <span class="text-slate-400">Kind</span>
        <span class="text-slate-500 capitalize">{t.variable.kind}</span>
      </div>
    </div>
  </div>
{/if}
