<script setup lang="ts">
/**
 * Scenario picker + playback strip (bottom). Transport/speed/scrubber
 * markup and timing live in shared components. No "new data" button here
 * — every scenario is deterministic, so regenerating would just replay
 * the identical trace.
 */
import { storeToRefs } from 'pinia'
import { useConcurrencyStore, CONCURRENCY } from '~/stores/concurrency'
import PlaybackTransport from '~/components/shared/PlaybackTransport.vue'

const store = useConcurrencyStore()
const { playing, speed } = storeToRefs(store)

const categories = computed(() => {
  const groups = new Map<string, typeof CONCURRENCY>()
  for (const c of CONCURRENCY) {
    if (!groups.has(c.category)) groups.set(c.category, [])
    groups.get(c.category)!.push(c)
  }
  return [...groups.entries()]
})

usePlaybackTimer(playing, speed, () => store.stepForward(), 500)
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

    <PlaybackTransport
      :playing="store.playing"
      :step-index="store.stepIndex"
      :trace-length="store.trace.length"
      :speed="store.speed"
      @restart="store.restart()"
      @step-back="store.stepBack()"
      @toggle-play="store.togglePlay()"
      @step-forward="store.stepForward()"
      @jump-to-end="store.seek(store.trace.length - 1)"
      @seek="store.seek($event)"
      @update:speed="store.speed = $event"
    />
  </section>
</template>
