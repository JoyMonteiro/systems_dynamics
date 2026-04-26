<script lang="ts">
  import type { Variable } from '../xmile/types.js';
  import { setParam, setToggle } from '../../stores/controls.js';

  let {
    sliders,
    toggles,
    paramValues,
    toggleStates,
    onReset,
    onRun,
    isSimulating,
  }: {
    sliders: Variable[];
    toggles: Variable[];
    paramValues: Map<string, number>;
    toggleStates: Map<string, boolean>;
    onReset: () => void;
    onRun: () => void;
    isSimulating: boolean;
  } = $props();

  function formatValue(v: number): string {
    if (Math.abs(v) >= 1e5 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(2);
    return v % 1 === 0 ? v.toString() : v.toFixed(2);
  }
</script>

<div class="flex h-full flex-col gap-4">
  <!-- Sliders -->
  {#if sliders.length}
    <section>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Parameters</h3>
      <div class="flex flex-col gap-3">
        {#each sliders as v}
          {@const spec = v.control}
          {#if spec?.kind === 'slider'}
            {@const val = paramValues.get(v.name) ?? spec.default}
            <div class="rounded-lg bg-slate-50 p-3">
              <div class="mb-1 flex items-baseline justify-between">
                <span class="text-sm font-medium text-slate-700 capitalize">{v.displayName}</span>
                <span class="font-mono text-sm text-blue-700"
                  >{formatValue(val)}<span class="ml-0.5 text-xs text-slate-400"
                    >{v.units ? ` ${v.units}` : ''}</span
                  ></span
                >
              </div>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={val}
                oninput={(e) => setParam(v.name, parseFloat((e.target as HTMLInputElement).value))}
                class="h-1.5 w-full cursor-pointer accent-blue-600"
              />
              <div class="mt-0.5 flex justify-between text-xs text-slate-400">
                <span>{formatValue(spec.min)}</span>
                <span>{formatValue(spec.max)}</span>
              </div>
              {#if v.doc}
                <p class="mt-1.5 text-xs leading-snug text-slate-500">{v.doc}</p>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </section>
  {/if}

  <!-- Toggles -->
  {#if toggles.length}
    <section>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Flows</h3>
      <div class="flex flex-col gap-2">
        {#each toggles as v}
          {@const isOn = toggleStates.get(v.name) ?? true}
          <button
            onclick={() => setToggle(v.name, !isOn)}
            class="flex items-center gap-3 rounded-lg p-3 text-left transition
              {isOn ? 'bg-blue-50 hover:bg-blue-100' : 'bg-slate-100 hover:bg-slate-200'}"
          >
            <!-- Toggle pill -->
            <div
              class="relative h-5 w-9 shrink-0 rounded-full transition-colors
                {isOn ? 'bg-blue-500' : 'bg-slate-300'}"
            >
              <div
                class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform
                  {isOn ? 'translate-x-4' : 'translate-x-0.5'}"
              ></div>
            </div>
            <div>
              <div class="text-sm font-medium capitalize {isOn ? 'text-blue-700' : 'text-slate-500'}">
                {v.displayName}
              </div>
              {#if v.doc}
                <div class="text-xs text-slate-400 leading-snug">{v.doc}</div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Actions -->
  <div class="mt-auto flex gap-2">
    <button
      onclick={onRun}
      disabled={isSimulating}
      class="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm
             transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60"
    >
      {isSimulating ? 'Simulating…' : '▶ Run'}
    </button>
    <button
      onclick={onReset}
      class="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600
             transition hover:bg-slate-50"
      title="Reset controls to defaults"
    >
      ↺
    </button>
  </div>
</div>
