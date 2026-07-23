<script setup lang="ts">
/**
 * Goal / Hint Visualization (top-right).
 *
 * Non-interactive and instructional. Match mode: the target curve, solid.
 * Series mode: the true function the partial sum is chasing. Number-goal
 * modes (area / slope / length) show the target value large over the grid,
 * with the user's current value beneath so the gap is one glance.
 * All modes share the one-line hint and the match meter.
 */
import { useWorkspaceStore } from '~/stores/workspace'
import { useGraphView } from '~/composables/useGraphView'
import CurveLine from '~/components/three/CurveLine.vue'
import GraphGrid from '~/components/three/GraphGrid.vue'
import MatchMeter from '~/components/ui/MatchMeter.vue'

const store = useWorkspaceStore()
// Shared viewport: panning/zooming the live panel moves this camera too,
// so comparing curves across panels stays a one-glance operation.
const { view } = useGraphView()

const panelTitle = computed(() => {
  switch (store.mode) {
    case 'integrate': return 'Enclose this area'
    case 'derive': return 'Hit this slope'
    case 'series': return 'Build this function'
    case 'arclength': return 'Match this length'
    default: return 'Match this curve'
  }
})

/** Number-goal modes: what to show big, and where the user currently is. */
const goalNumber = computed(() => {
  switch (store.mode) {
    case 'integrate':
      return {
        value: store.targetArea,
        caption: 'target area between p and q',
        yours: store.exactArea,
      }
    case 'derive':
      return {
        value: store.targetSlope,
        caption: 'target slope at the probe',
        yours: store.probeSlope,
      }
    case 'arclength':
      return {
        value: store.targetLength,
        caption: 'target curve length from p to q',
        yours: store.exactLength,
      }
    default:
      return null
  }
})
</script>

<template>
  <section
    class="graph-paper graph-paper-dark relative flex flex-col overflow-hidden rounded-xl shadow-panel"
    aria-label="Goal visualization"
  >
    <header class="relative z-10 flex items-center justify-between px-4 pt-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.18em] text-paper-dim">Goal</p>
        <h2 class="font-display text-sm font-600 text-paper">{{ panelTitle }}</h2>
      </div>
      <span class="rounded-full bg-goal/10 px-2.5 py-0.5 font-mono text-[11px] text-goal">
        target
      </span>
    </header>

    <ClientOnly>
      <!-- Opaque near-black clear color: guarantees a dark plot area even
           where canvas transparency misbehaves (user request, 2026-07-23) -->
      <TresCanvas clear-color="#080D1A" class="!absolute inset-0 !bg-ink-950">
        <TresPerspectiveCamera
          :position="[view.x, view.y, view.z]"
          :fov="60"
          :look-at="[view.x, view.y, 0]"
        />
        <GraphGrid />
        <!-- The goal curve only (match + series — in number modes the goal is a number) -->
        <CurveLine
          v-if="store.mode === 'match' || store.mode === 'series'"
          :points="store.targetPoints"
          color="#FFB454"
        />
      </TresCanvas>
    </ClientOnly>

    <!-- Number-goal modes: the target, front and center -->
    <div
      v-if="goalNumber"
      class="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-center gap-1"
    >
      <div
        class="flex flex-col items-center gap-1 rounded-md border border-ink-700/60 bg-ink-900/80 px-5 py-3"
      >
        <p class="font-mono text-4xl tabular-nums text-goal">
          {{ goalNumber.value === null ? '—' : goalNumber.value.toFixed(1) }}
        </p>
        <p class="font-display text-xs text-paper-dim">{{ goalNumber.caption }}</p>
        <p class="mt-1 font-mono text-sm tabular-nums" :class="store.isMatched ? 'text-match' : 'text-live'">
          yours: {{ goalNumber.yours.toFixed(2) }}
        </p>
      </div>
    </div>
    <div v-else class="min-h-[160px] flex-1" />

    <footer class="relative z-10 space-y-2 px-4 pb-4">
      <p
        class="font-display text-sm transition-colors"
        :class="store.isMatched ? 'text-match' : 'text-paper-dim'"
        aria-live="polite"
      >
        {{ store.hint.text }}
      </p>
      <MatchMeter />
    </footer>
  </section>
</template>
