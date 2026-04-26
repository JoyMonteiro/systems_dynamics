<script lang="ts">
  import type { ManifestEntry } from '../xmile/types.js';

  let { entries, onselect }: { entries: ManifestEntry[]; onselect: (e: ManifestEntry) => void } =
    $props();
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#each entries as entry (entry.id)}
    <button
      onclick={() => onselect(entry)}
      class="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
    >
      <div class="mb-1 flex items-start justify-between gap-2">
        <h3 class="text-base font-semibold text-slate-800 group-hover:text-blue-700">
          {entry.title}
        </h3>
        {#if entry.difficulty}
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium
              {entry.difficulty === 'beginner'
              ? 'bg-green-100 text-green-700'
              : entry.difficulty === 'intermediate'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'}"
          >
            {entry.difficulty}
          </span>
        {/if}
      </div>
      {#if entry.subtitle}
        <p class="text-sm text-slate-500">{entry.subtitle}</p>
      {/if}
      {#if entry.tags?.length}
        <div class="mt-3 flex flex-wrap gap-1">
          {#each entry.tags as tag}
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{tag}</span>
          {/each}
        </div>
      {/if}
    </button>
  {/each}
</div>
