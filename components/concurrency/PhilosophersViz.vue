<script setup lang="ts">
/**
 * Dining philosophers, drawn as a round table. Positions come from simple
 * trig (N seats evenly spaced), same "no store logic in components" rule
 * as the rest of the app — this just renders `state`.
 */
import type { ConcurrencyStepState } from '~/stores/concurrency'

const props = defineProps<{ state: ConcurrencyStepState }>()

const CX = 200
const CY = 200
const SEAT_R = 145
const FORK_R = 95

const n = computed(() => props.state.phils.length)

function seatPos(i: number) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n.value
  return { x: CX + SEAT_R * Math.cos(angle), y: CY + SEAT_R * Math.sin(angle) }
}
function forkPos(i: number) {
  // fork i sits between seat i and seat i+1
  const angle = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n.value
  return { x: CX + FORK_R * Math.cos(angle), y: CY + FORK_R * Math.sin(angle) }
}

function philClass(i: number): string {
  const p = props.state.phils[i]
  if (!p) return ''
  if (props.state.deadlocked && (p.phase === 'hungry' || p.phase === 'holding1')) {
    return 'fill-danger/20 stroke-danger text-danger'
  }
  switch (p.phase) {
    case 'eating': return 'fill-match/20 stroke-match text-match'
    case 'satisfied': return 'fill-derived/15 stroke-derived text-derived'
    case 'hungry':
    case 'holding1': return 'fill-goal/15 stroke-goal text-goal'
    default: return 'fill-ink-800 stroke-ink-600 text-paper-dim'
  }
}

function phaseLabel(i: number): string {
  const p = props.state.phils[i]
  if (!p) return ''
  switch (p.phase) {
    case 'thinking': return 'thinking'
    case 'hungry': return 'hungry'
    case 'holding1': return 'waiting'
    case 'eating': return 'eating'
    case 'satisfied': return 'done'
    default: return ''
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-2 pt-1">
    <svg
      viewBox="0 0 400 400"
      class="min-h-0 w-full flex-1"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Dining philosophers around a round table"
    >
      <circle :cx="CX" :cy="CY" r="60" class="fill-ink-800 stroke-ink-600" stroke-width="2" />
      <text :x="CX" :y="CY + 4" text-anchor="middle" class="font-display text-[11px] fill-paper-faint">
        table
      </text>

      <!-- Forks -->
      <g v-for="(held, i) in state.forks" :key="`fork-${i}`">
        <rect
          :x="forkPos(i).x - 5"
          :y="forkPos(i).y - 13"
          width="10"
          height="26"
          rx="2"
          class="transition-colors"
          :class="held !== null ? 'fill-live/25 stroke-live' : 'fill-ink-800 stroke-ink-600'"
          stroke-width="1.5"
        />
      </g>

      <!-- Philosophers -->
      <g v-for="i in n" :key="`phil-${i - 1}`">
        <circle
          :cx="seatPos(i - 1).x"
          :cy="seatPos(i - 1).y"
          r="30"
          stroke-width="2"
          class="transition-colors"
          :class="philClass(i - 1)"
        />
        <text
          :x="seatPos(i - 1).x"
          :y="seatPos(i - 1).y - 3"
          text-anchor="middle"
          class="pointer-events-none font-display text-[13px] font-semibold"
          :class="philClass(i - 1)"
        >
          P{{ i - 1 }}
        </text>
        <text
          :x="seatPos(i - 1).x"
          :y="seatPos(i - 1).y + 12"
          text-anchor="middle"
          class="pointer-events-none font-mono text-[9px]"
          :class="philClass(i - 1)"
        >
          {{ phaseLabel(i - 1) }}
        </text>
      </g>
    </svg>

    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-1">
      <div v-for="i in n" :key="`meal-${i - 1}`" class="flex items-center gap-1 font-mono text-[11px] text-paper-dim">
        <span class="text-paper-faint">P{{ i - 1 }}</span>
        <span>{{ '🍝'.repeat(state.phils[i - 1]?.meals ?? 0) || '—' }}</span>
      </div>
    </div>
    <p class="font-display text-[11px] text-paper-faint">
      amber = trying to eat · green = eating · violet = satisfied (done) · red = deadlocked
    </p>
  </div>
</template>
