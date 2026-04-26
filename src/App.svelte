<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import { parseXmile } from './lib/xmile/parse.js';
  import { defaultChartVars, sliderVars, toggleVars } from './lib/xmile/conventions.js';
  import { runSimulation } from './lib/sim/runner.js';
  import {
    manifest,
    currentModel,
    currentEntry,
    descriptionMd,
    modelLoading,
    modelError,
  } from './stores/model.js';
  import { controlState, initControls, resetControls, paramValues, toggleStates } from './stores/controls.js';
  import { runHistory, isSimulating, cursorTime, pushResults, clearHistory } from './stores/results.js';
  import ModelPicker from './lib/ui/ModelPicker.svelte';
  import ControlPanel from './lib/ui/ControlPanel.svelte';
  import Diagram from './lib/render/Diagram.svelte';
  import TimeSeries from './lib/chart/TimeSeries.svelte';
  import Tooltip from './lib/ui/Tooltip.svelte';
  import type { ManifestEntry } from './lib/xmile/types.js';

  const BASE = import.meta.env.BASE_URL;

  let cursorIdx = $state(0);

  onMount(async () => {
    try {
      const res = await fetch(`${BASE}models/index.json`);
      if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
      const data = await res.json() as { models: ManifestEntry[] };
      manifest.set(data.models);
    } catch (e) {
      modelError.set(String(e));
    }
  });

  async function selectModel(entry: ManifestEntry) {
    modelLoading.set(true);
    modelError.set(null);
    clearHistory();
    try {
      const xmileRes = await fetch(`${BASE}models/${entry.file}`);
      if (!xmileRes.ok) throw new Error(`Could not load model file: ${entry.file}`);
      const xml = await xmileRes.text();
      const model = parseXmile(xml, entry.id);
      currentModel.set(model);
      currentEntry.set(entry);
      initControls(model);

      if (entry.description_file) {
        const mdRes = await fetch(`${BASE}models/${entry.description_file}`);
        descriptionMd.set(mdRes.ok ? await mdRes.text() : '');
      } else {
        descriptionMd.set('');
      }
    } catch (e) {
      modelError.set(String(e));
      currentModel.set(null);
    } finally {
      modelLoading.set(false);
    }
  }

  function handleRun() {
    if (!$currentModel) return;
    isSimulating.set(true);
    setTimeout(() => {
      try {
        const results = runSimulation($currentModel!, $controlState);
        pushResults(results);
      } catch (e) {
        modelError.set(`Simulation error: ${e}`);
      } finally {
        isSimulating.set(false);
      }
    }, 0);
  }

  function handleReset() {
    if ($currentModel) {
      resetControls($currentModel);
      clearHistory();
    }
  }

  const chartVars = $derived($currentModel ? defaultChartVars($currentModel.variables) : []);
  const sliders = $derived($currentModel ? sliderVars($currentModel.variables) : []);
  const toggles = $derived($currentModel ? toggleVars($currentModel.variables) : []);
  const descHtml = $derived($descriptionMd ? marked($descriptionMd) as string : '');
</script>

<div class="flex h-screen flex-col bg-slate-50 font-sans text-slate-900">
  <!-- Header -->
  <header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
    <div class="flex items-center gap-3">
      <button
        onclick={() => { currentModel.set(null); currentEntry.set(null); clearHistory(); }}
        class="flex items-center gap-2 text-lg font-bold text-blue-700 hover:text-blue-900"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="8" width="6" height="8" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <circle cx="17" cy="12" r="2"/>
          <line x1="15" y1="6" x2="15" y2="18" stroke-width="1" opacity="0.4"/>
        </svg>
        Systems Dynamics Game
      </button>
      {#if $currentEntry}
        <span class="text-slate-300">›</span>
        <span class="text-sm font-medium text-slate-600">{$currentEntry.title}</span>
      {/if}
    </div>
    {#if $currentModel}
      <button
        onclick={() => { currentModel.set(null); currentEntry.set(null); clearHistory(); }}
        class="text-sm text-slate-500 hover:text-slate-800"
      >
        ← All Models
      </button>
    {/if}
  </header>

  <!-- Error banner -->
  {#if $modelError}
    <div class="flex items-center gap-3 bg-red-50 px-6 py-3 text-sm text-red-700 border-b border-red-200">
      <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      {$modelError}
      <button onclick={() => modelError.set(null)} class="ml-auto text-red-500 hover:text-red-800">✕</button>
    </div>
  {/if}

  <!-- Main content -->
  <main class="flex-1 overflow-hidden">
    {#if $modelLoading}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-slate-500">
          <div class="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          Loading model…
        </div>
      </div>
    {:else if !$currentModel}
      <!-- Model picker -->
      <div class="mx-auto max-w-5xl px-6 py-10">
        <h2 class="mb-2 text-2xl font-bold text-slate-800">Choose a Model</h2>
        <p class="mb-8 text-slate-500">Select a system dynamics model to explore and experiment with.</p>
        {#if $manifest.length}
          <ModelPicker entries={$manifest} onselect={selectModel} />
        {:else}
          <p class="text-slate-400">No models available. Add model files to <code>public/models/</code>.</p>
        {/if}
      </div>
    {:else}
      <!-- Game layout: sidebar + main area -->
      <div class="flex h-full">
        <!-- Left sidebar: description + controls -->
        <div class="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white overflow-y-auto">
          <!-- Description -->
          {#if $currentModel.meta.description || descHtml}
            <div class="border-b border-slate-100 p-4">
              {#if descHtml}
                <div class="prose prose-sm prose-slate max-w-none text-sm">
                  {@html descHtml}
                </div>
              {:else}
                <p class="text-sm text-slate-600">{$currentModel.meta.description}</p>
              {/if}
            </div>
          {/if}

          <!-- Controls -->
          <div class="flex-1 p-4">
            <ControlPanel
              {sliders}
              {toggles}
              paramValues={$paramValues}
              toggleStates={$toggleStates}
              onReset={handleReset}
              onRun={handleRun}
              isSimulating={$isSimulating}
            />
          </div>

          <!-- Sim metadata -->
          <div class="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
            t = {$currentModel.meta.timeStart}–{$currentModel.meta.timeStop}
            {$currentModel.meta.timeUnit} · dt = {$currentModel.meta.dt}
          </div>
        </div>

        <!-- Right: diagram + chart -->
        <div class="flex flex-1 flex-col min-w-0">
          <!-- Diagram -->
          <div class="flex-1 min-h-0 p-4 pb-2">
            <Diagram
              model={$currentModel}
              latestResults={$runHistory[0]?.results}
              toggleStates={$toggleStates}
              cursorTimeIdx={cursorIdx}
            />
          </div>

          <!-- Chart -->
          <div class="h-56 border-t border-slate-200 p-4 pt-2">
            <TimeSeries
              runs={$runHistory}
              {chartVars}
              timeUnit={$currentModel.meta.timeUnit}
              onCursorChange={(idx) => { cursorIdx = idx; }}
            />
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

<Tooltip />
