<script setup lang="ts">
/**
 * Playback + algorithm picker strip (bottom).
 *
 * Playback pacing lives here, not in the store: the trace is exact data,
 * the timer is presentation (same rule as the curve easing). The interval
 * simply advances the step index; the store stops itself at the end.
 */
import { useIntervalFn } from '@vueuse/core'
import { useAlgoStore, ALGOS } from '~/stores/algorithms'

const store = useAlgoStore()

const categories = computed(() => {
  const groups = new Map<string, typeof ALGOS>()
  for (const a of ALGOS) {
    if (!groups.has(a.category)) groups.set(a.category, [])
    groups.get(a.category)!.push(a)
  }
  return [...groups.entries()]
})

const SPEEDS = [0.5, 1, 2, 4]
const BASE_STEP_MS = 650
const interval = computed(() => BASE_STEP_MS / store.speed)

const { pause, resume } = useIntervalFn(() => store.stepForward(), interval, {
  immediate: false,
})
watch(() => store.playing, p => (p ? resume() : pause()))
onUnmounted(pause)

const newDataLabel = computed(() => {
  if (store.algoId === 'trie') return 'New words'
  switch (store.algo.viz) {
    case 'graph': return 'New graph'
    case 'array': return 'New array'
    case 'hash': return 'New keys'
    case 'lru': return 'New ops'
    case 'grid': return 'New items'
    case 'maze': return 'New maze'
    default: return 'New values'
  }
})
</script>

<template>
  <section
    class="graph-paper relative flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3 shadow-panel"
    aria-label="Algorithm playback controls"
  >
    <!-- Algorithm picker -->
    <label class="flex items-center gap-2">
      <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">Algorithm</span>
      <select
        :value="store.algoId"
        class="rounded-md border border-ink-700 bg-ink-800 px-2 py-1.5 font-display text-sm text-paper outline-none focus:border-live/60"
        @change="store.selectAlgo(($event.target as HTMLSelectElement).value)"
      >
        <optgroup v-for="[cat, algos] in categories" :key="cat" :label="cat">
          <option v-for="a in algos" :key="a.id" :value="a.id">{{ a.label }}</option>
        </optgroup>
      </select>
    </label>

    <button
      class="rounded-md border border-ink-700 bg-ink-800 px-3 py-1.5 font-display text-sm text-paper transition-colors hover:border-goal/60 hover:text-goal"
      @click="store.regenerate()"
    >
      {{ newDataLabel }}
    </button>

    <!-- Transport -->
    <div class="flex items-center gap-1" role="group" aria-label="Step controls">
      <button class="ctl" aria-label="Restart" @click="store.restart()">⏮</button>
      <button class="ctl" aria-label="Step back" @click="store.stepBack()">◀</button>
      <button
        class="ctl min-w-[72px] font-semibold"
        :class="store.playing ? 'border-live/70 text-live' : ''"
        @click="store.togglePlay()"
      >
        {{ store.playing ? 'Pause' : 'Play' }}
      </button>
      <button class="ctl" aria-label="Step forward" @click="store.stepForward()">▶</button>
      <button class="ctl" aria-label="Jump to end" @click="store.seek(store.trace.length - 1)">⏭</button>
    </div>

    <!-- Speed -->
    <label class="flex items-center gap-2">
      <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">Speed</span>
      <select
        :value="store.speed"
        class="rounded-md border border-ink-700 bg-ink-800 px-2 py-1.5 font-mono text-sm text-paper outline-none focus:border-live/60"
        @change="store.speed = Number(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="s in SPEEDS" :key="s" :value="s">{{ s }}×</option>
      </select>
    </label>

    <!-- Scrubber -->
    <div class="flex min-w-[180px] flex-1 items-center gap-3">
      <input
        type="range"
        :min="0"
        :max="Math.max(store.trace.length - 1, 0)"
        :value="store.stepIndex"
        aria-label="Scrub through algorithm steps"
        @input="store.seek(Number(($event.target as HTMLInputElement).value))"
      >
      <span class="shrink-0 font-mono text-xs tabular-nums text-paper-dim">
        {{ store.stepIndex + 1 }} / {{ store.trace.length }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.ctl {
  @apply rounded-md border border-ink-700 bg-ink-800 px-2.5 py-1.5 font-display text-sm text-paper transition-colors hover:border-live/60 hover:text-live;
}
</style>
