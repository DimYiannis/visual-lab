<script setup lang="ts">
/**
 * Algorithm picker + "new data" button + playback strip (bottom).
 * Transport/speed/scrubber markup and timing live in shared components —
 * this file only owns what's actually Algorithm-Lab-specific.
 */
import { storeToRefs } from 'pinia'
import { useAlgoStore, ALGOS } from '~/stores/algorithms'
import PlaybackTransport from '~/components/shared/PlaybackTransport.vue'

const store = useAlgoStore()
const { playing, speed } = storeToRefs(store)

const categories = computed(() => {
  const groups = new Map<string, typeof ALGOS>()
  for (const a of ALGOS) {
    if (!groups.has(a.category)) groups.set(a.category, [])
    groups.get(a.category)!.push(a)
  }
  return [...groups.entries()]
})

usePlaybackTimer(playing, speed, () => store.stepForward())

const newDataLabel = computed(() => {
  if (store.algoId === 'trie') return 'New words'
  switch (store.algo.viz) {
    case 'graph': return 'New graph'
    case 'array': return 'New array'
    case 'hash': return 'New keys'
    case 'lru': return 'New ops'
    case 'grid': return 'New items'
    case 'maze': return 'New maze'
    case 'queens': return 'New board'
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
