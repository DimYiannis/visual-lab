<script setup lang="ts">
/**
 * Playback + scenario picker (bottom). Mirrors AlgoControls.vue's
 * pacing rule: the trace is exact data, the timer is presentation only.
 * No "new data" button here — the scheduler is deterministic, so
 * regenerating would just replay the identical trace.
 */
import { useIntervalFn } from '@vueuse/core'
import { useConcurrencyStore, CONCURRENCY } from '~/stores/concurrency'

const store = useConcurrencyStore()

const categories = computed(() => {
  const groups = new Map<string, typeof CONCURRENCY>()
  for (const c of CONCURRENCY) {
    if (!groups.has(c.category)) groups.set(c.category, [])
    groups.get(c.category)!.push(c)
  }
  return [...groups.entries()]
})

const SPEEDS = [0.5, 1, 2, 4]
const BASE_STEP_MS = 500
const interval = computed(() => BASE_STEP_MS / store.speed)

const { pause, resume } = useIntervalFn(() => store.stepForward(), interval, {
  immediate: false,
})
watch(() => store.playing, p => (p ? resume() : pause()))
onUnmounted(pause)
</script>

<template>
  <section
    class="graph-paper relative flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3 shadow-panel"
    aria-label="Concurrency playback controls"
  >
    <label class="flex items-center gap-2">
      <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">Scenario</span>
      <select
        :value="store.conId"
        class="rounded-md border border-ink-700 bg-ink-800 px-2 py-1.5 font-display text-sm text-paper outline-none focus:border-live/60"
        @change="store.selectCon(($event.target as HTMLSelectElement).value)"
      >
        <optgroup v-for="[cat, cons] in categories" :key="cat" :label="cat">
          <option v-for="c in cons" :key="c.id" :value="c.id">{{ c.label }}</option>
        </optgroup>
      </select>
    </label>

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

    <div class="flex min-w-[180px] flex-1 items-center gap-3">
      <input
        type="range"
        :min="0"
        :max="Math.max(store.trace.length - 1, 0)"
        :value="store.stepIndex"
        aria-label="Scrub through simulation steps"
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
