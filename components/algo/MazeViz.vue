<script setup lang="ts">
/**
 * A* maze visualization: a plain CSS grid of cells. Flat index = row * W + col
 * (matches the runner). Walls are static; everything else — open/closed
 * sets, the current cell, the final path — comes straight from the step.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{ state: StepState }>()

const cells = computed(() => props.state.mazeW * props.state.mazeH)

function fScore(idx: number): string {
  const s = props.state.mazeScores[idx]
  if (!s) return ''
  const f = s.split(' ').find(t => t.startsWith('f'))
  return f ?? ''
}

function cellClass(idx: number): string {
  const s = props.state
  if (s.mazeWalls.includes(idx)) return 'bg-ink-700 border-ink-600'
  if (idx === s.mazeStart) return 'bg-ink-800 border-live text-live'
  if (idx === s.mazeGoal) return 'bg-ink-800 border-goal text-goal'
  if (s.done && s.mazePath.includes(idx)) return 'bg-derived/25 border-derived text-derived'
  if (s.mazeCurrent === idx) return 'bg-live border-live text-ink-950'
  if (s.mazeOpen.includes(idx)) return 'bg-goal/10 border-goal/60 text-goal'
  if (s.mazeClosed.includes(idx)) return 'bg-live/10 border-live/30 text-live'
  return 'bg-ink-800 border-ink-600 text-paper-faint'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-2 pt-1">
    <div
      class="grid gap-1"
      :style="{
        gridTemplateColumns: `repeat(${state.mazeW}, minmax(0, 1fr))`,
        width: '100%',
        maxWidth: '520px',
      }"
      role="img"
      aria-label="Grid maze being searched by A*"
    >
      <div
        v-for="idx in cells"
        :key="idx - 1"
        class="relative flex aspect-square items-center justify-center rounded border font-mono text-[10px] transition-colors"
        :class="cellClass(idx - 1)"
      >
        <span v-if="idx - 1 === state.mazeStart" class="text-xs font-semibold">S</span>
        <span v-else-if="idx - 1 === state.mazeGoal" class="text-xs font-semibold">G</span>
        <span v-else-if="!state.mazeWalls.includes(idx - 1)" class="opacity-70">{{ fScore(idx - 1) }}</span>
      </div>
    </div>
    <p class="font-display text-[11px] text-paper-faint">
      amber = open set · cyan fill = current cell · faint cyan = closed · violet = final path
    </p>
  </div>
</template>
