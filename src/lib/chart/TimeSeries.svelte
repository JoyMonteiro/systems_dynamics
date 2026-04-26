<script lang="ts">
  import { onMount } from 'svelte';
  import type { SimResults } from '../sim/engine.js';
  import type { Variable } from '../xmile/types.js';
  import type { RunRecord } from '../../stores/results.js';

  let {
    runs,
    chartVars,
    timeUnit,
    onCursorChange,
  }: {
    runs: RunRecord[];
    chartVars: Variable[];
    timeUnit: string;
    onCursorChange: (idx: number) => void;
  } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];
  const MARGIN = { top: 24, right: 24, bottom: 40, left: 64 };

  function formatNum(v: number): string {
    if (Math.abs(v) >= 1e5 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
    if (v % 1 === 0) return v.toString();
    return v.toFixed(1);
  }

  function drawChart() {
    if (!ctx || runs.length === 0 || chartVars.length === 0) {
      if (ctx) {
        ctx.clearRect(0, 0, containerWidth, containerHeight);
      }
      return;
    }

    const W = containerWidth;
    const H = containerHeight;
    ctx.clearRect(0, 0, W, H);

    const plotW = W - MARGIN.left - MARGIN.right;
    const plotH = H - MARGIN.top - MARGIN.bottom;
    if (plotW <= 0 || plotH <= 0) return;

    // Gather all data for scale computation
    const latestRun = runs[0].results;
    const times = latestRun.times;
    const tMin = times[0] ?? 0;
    const tMax = times[times.length - 1] ?? 1;

    let yMin = Infinity;
    let yMax = -Infinity;
    for (const run of runs) {
      for (const v of chartVars) {
        const series = run.results.series.get(v.name);
        if (!series) continue;
        for (const val of series) {
          yMin = Math.min(yMin, val);
          yMax = Math.max(yMax, val);
        }
      }
    }
    if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
    const yPad = (yMax - yMin) * 0.1 || 1;
    yMin -= yPad;
    yMax += yPad;

    const scaleX = (t: number) => MARGIN.left + ((t - tMin) / (tMax - tMin || 1)) * plotW;
    const scaleY = (v: number) => MARGIN.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(MARGIN.left, MARGIN.top, plotW, plotH);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const v = yMin + (i / yTicks) * (yMax - yMin);
      const y = scaleY(v);
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotW, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatNum(v), MARGIN.left - 6, y + 4);
    }
    const xTicks = 6;
    for (let i = 0; i <= xTicks; i++) {
      const t = tMin + (i / xTicks) * (tMax - tMin);
      const x = scaleX(t);
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatNum(t), x, MARGIN.top + plotH + 16);
    }

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, MARGIN.top);
    ctx.lineTo(MARGIN.left, MARGIN.top + plotH);
    ctx.lineTo(MARGIN.left + plotW, MARGIN.top + plotH);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timeUnit, MARGIN.left + plotW / 2, H - 4);

    // Draw series for each run (oldest first, lowest opacity)
    for (let ri = runs.length - 1; ri >= 0; ri--) {
      const run = runs[ri];
      chartVars.forEach((v, ci) => {
        const series = run.results.series.get(v.name);
        if (!series) return;
        const color = COLORS[ci % COLORS.length];
        ctx!.strokeStyle = color;
        ctx!.globalAlpha = run.opacity;
        ctx!.lineWidth = ri === 0 ? 2.5 : 1.5;
        ctx!.beginPath();
        let first = true;
        series.forEach((val, i) => {
          const x = scaleX(times[i]);
          const y = scaleY(val);
          if (first) { ctx!.moveTo(x, y); first = false; }
          else ctx!.lineTo(x, y);
        });
        ctx!.stroke();
      });
    }
    ctx!.globalAlpha = 1;

    // Legend
    chartVars.forEach((v, ci) => {
      const color = COLORS[ci % COLORS.length];
      const lx = MARGIN.left + ci * 130;
      const ly = 10;
      ctx!.fillStyle = color;
      ctx!.fillRect(lx, ly, 20, 3);
      ctx!.fillStyle = '#334155';
      ctx!.font = '11px sans-serif';
      ctx!.textAlign = 'left';
      ctx!.fillText(v.displayName, lx + 24, ly + 5);
    });
  }

  let cursorX = $state<number | null>(null);
  let cursorLabel = $state<string | null>(null);

  function onMouseMoveChart(e: MouseEvent) {
    if (runs.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < MARGIN.left || x > containerWidth - MARGIN.right) { cursorX = null; return; }

    const latestTimes = runs[0].results.times;
    const tMin = latestTimes[0] ?? 0;
    const tMax = latestTimes[latestTimes.length - 1] ?? 1;
    const plotW = containerWidth - MARGIN.left - MARGIN.right;
    const t = tMin + ((x - MARGIN.left) / plotW) * (tMax - tMin);
    const idx = Math.round((t - tMin) / ((tMax - tMin) / (latestTimes.length - 1)));
    const clampedIdx = Math.max(0, Math.min(latestTimes.length - 1, idx));

    cursorX = x;
    cursorLabel = `t=${formatNum(latestTimes[clampedIdx])} ${timeUnit}`;
    onCursorChange(clampedIdx);
  }

  function onMouseLeaveChart() {
    cursorX = null;
    onCursorChange(0);
  }

  let resizeObserver: ResizeObserver;

  onMount(() => {
    ctx = canvas.getContext('2d');
    resizeObserver = new ResizeObserver((entries) => {
      for (const e of entries) {
        containerWidth = e.contentRect.width;
        containerHeight = e.contentRect.height;
        canvas.width = containerWidth * devicePixelRatio;
        canvas.height = containerHeight * devicePixelRatio;
        ctx?.scale(devicePixelRatio, devicePixelRatio);
        drawChart();
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  });

  $effect(() => {
    // Re-draw whenever runs or chartVars change
    void runs;
    void chartVars;
    drawChart();
  });
</script>

<div class="relative h-full w-full" bind:this={container}>
  <canvas
    bind:this={canvas}
    class="h-full w-full"
    onmousemove={onMouseMoveChart}
    onmouseleave={onMouseLeaveChart}
  ></canvas>

  <!-- Cursor line -->
  {#if cursorX != null}
    <div
      class="pointer-events-none absolute top-0 bottom-0 w-px bg-slate-400 opacity-60"
      style="left: {cursorX}px"
    ></div>
    <div
      class="pointer-events-none absolute rounded bg-slate-700 px-1.5 py-0.5 text-xs text-white"
      style="left: {cursorX + 6}px; top: {MARGIN.top}px"
    >
      {cursorLabel}
    </div>
  {/if}

  {#if runs.length === 0}
    <div class="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
      Press <span class="mx-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-600">▶ Run</span> to simulate
    </div>
  {/if}
</div>
