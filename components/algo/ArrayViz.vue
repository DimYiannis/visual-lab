<script setup lang="ts">
/**
 * Array visualization (right panel) for sorting and searching.
 *
 * Bars are plain divs on a CSS grid; heights transition so swaps and shifts
 * read as motion (globally snapped to instant under prefers-reduced-motion).
 *
 * Bar colors: cyan = data, amber = being compared, violet = in sorted
 * position so far, ghosted = ruled out (binary search). Green floods only
 * when the algorithm finishes — success keeps its one meaning.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{
  state: StepState
  /** Binary search only — shown as a chip above the bars. */
  target: number | null
}>()

const maxValue = computed(() => Math.max(...props.state.array, 1))

function barClass(i: number): string {
  const s = props.state
  if (s.foundIndex === i) return 'bg-match shadow-glowMatch'
  if (s.done) return 'bg-match/80'
  if (s.compare.includes(i)) return 'bg-goal'
  if (s.discarded.includes(i)) return 'bg-live/25 opacity-25'
  if (s.locked.includes(i)) return 'bg-derived/70'
  return 'bg-live/70'
}

/** Cursor labels (lo/mid/hi/i/j) grouped under their column. */
const markers = computed(() => {
  const byIndex: Record<number, string[]> = {}
  for (const [name, idx] of Object.entries(props.state.cursors)) {
    if (idx >= 0 && idx < props.state.array.length) (byIndex[idx] ??= []).push(name)
  }
  return byIndex
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col justify-end gap-1 px-2 pb-1">
    <div v-if="target !== null" class="flex justify-center pb-2">
      <span class="rounded-full border border-goal/40 bg-goal/10 px-3 py-1 font-mono text-sm text-goal">
        target = {{ target }}
      </span>
    </div>

    <div
      class="grid min-h-0 flex-1 items-end gap-1.5"
      :style="{ gridTemplateColumns: `repeat(${state.array.length}, minmax(0, 1fr))` }"
      role="img"
      aria-label="Array being processed by the algorithm"
    >
      <div v-for="(v, i) in state.array" :key="i" class="flex h-full flex-col items-center justify-end gap-1">
        <span class="font-mono text-[11px] tabular-nums text-paper-dim">{{ v }}</span>
        <div
          class="w-full rounded-t-sm transition-[height] duration-200"
          :class="barClass(i)"
          :style="{ height: `${(v / maxValue) * 82}%` }"
        />
      </div>
    </div>

    <!-- Index + cursor rows -->
    <div
      class="grid gap-1.5"
      :style="{ gridTemplateColumns: `repeat(${state.array.length}, minmax(0, 1fr))` }"
    >
      <div v-for="(v, i) in state.array" :key="i" class="flex flex-col items-center">
        <span class="font-mono text-[10px] text-paper-faint">{{ i }}</span>
        <span class="h-4 font-mono text-[11px] font-medium text-goal">
          {{ (markers[i] ?? []).join(',') }}
        </span>
      </div>
    </div>
  </div>
</template>
