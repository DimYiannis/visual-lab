<script setup lang="ts">
/**
 * N-Queens visualization: an N×N chessboard. `queensBoard[col] = row` (or
 * -1 if that column is still empty) — everything else (the cell being
 * tried, the conflicting queen blocking it) comes straight from the step.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{ state: StepState }>()

const n = computed(() => props.state.queensN)
const cells = computed(() => n.value * n.value)

function rowOf(idx: number): number {
  return Math.floor(idx / n.value)
}
function colOf(idx: number): number {
  return idx % n.value
}

function hasQueen(row: number, col: number): boolean {
  return props.state.queensBoard[col] === row
}

function cellClass(row: number, col: number): string {
  const s = props.state
  const trying = s.queensCol === col && s.queensTryRow === row
  const blocked = s.queensConflict && s.queensConflict[0] === row && s.queensConflict[1] === col

  if (hasQueen(row, col)) {
    return s.done ? 'bg-match/20 border-match text-match' : 'bg-live/20 border-live text-live'
  }
  if (trying) return 'bg-goal/15 border-goal text-goal'
  if (blocked) return 'bg-danger/15 border-danger text-danger'
  return (row + col) % 2 === 0
    ? 'bg-ink-800 border-ink-700 text-transparent'
    : 'bg-ink-900 border-ink-700 text-transparent'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-2 pt-1">
    <div
      class="grid gap-1"
      :style="{
        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
        width: '100%',
        maxWidth: '420px',
      }"
      role="img"
      :aria-label="`${n}-Queens board`"
    >
      <div
        v-for="idx in cells"
        :key="idx - 1"
        class="flex aspect-square items-center justify-center rounded border text-lg transition-colors"
        :class="cellClass(rowOf(idx - 1), colOf(idx - 1))"
      >
        <span v-if="hasQueen(rowOf(idx - 1), colOf(idx - 1))">♛</span>
      </div>
    </div>
    <p class="font-display text-[11px] text-paper-faint">
      cyan = placed · amber = row being tried · red = blocked by this queen · green = solved
    </p>
  </div>
</template>
