<script setup lang="ts">
/**
 * Restart / step-back / play-pause / step-forward / jump-to-end + speed
 * picker + scrubber. Pure props/emits — no store coupling — shared by
 * AlgoControls and ConcurrencyControls so the transport markup exists once.
 */
const props = defineProps<{
  playing: boolean
  stepIndex: number
  traceLength: number
  speed: number
}>()

const emit = defineEmits<{
  restart: []
  stepBack: []
  togglePlay: []
  stepForward: []
  jumpToEnd: []
  seek: [value: number]
  'update:speed': [value: number]
}>()

const SPEEDS = [0.5, 1, 2, 4]
</script>

<template>
  <div class="flex items-center gap-1" role="group" aria-label="Step controls">
    <button class="ctl" aria-label="Restart" @click="emit('restart')">⏮</button>
    <button class="ctl" aria-label="Step back" @click="emit('stepBack')">◀</button>
    <button
      class="ctl min-w-[72px] font-semibold"
      :class="props.playing ? 'border-live/70 text-live' : ''"
      @click="emit('togglePlay')"
    >
      {{ props.playing ? 'Pause' : 'Play' }}
    </button>
    <button class="ctl" aria-label="Step forward" @click="emit('stepForward')">▶</button>
    <button class="ctl" aria-label="Jump to end" @click="emit('jumpToEnd')">⏭</button>
  </div>

  <label class="flex items-center gap-2">
    <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">Speed</span>
    <select
      :value="props.speed"
      class="rounded-md border border-ink-700 bg-ink-800 px-2 py-1.5 font-mono text-sm text-paper outline-none focus:border-live/60"
      @change="emit('update:speed', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="s in SPEEDS" :key="s" :value="s">{{ s }}×</option>
    </select>
  </label>

  <div class="flex min-w-[180px] flex-1 items-center gap-3">
    <input
      type="range"
      :min="0"
      :max="Math.max(props.traceLength - 1, 0)"
      :value="props.stepIndex"
      aria-label="Scrub through steps"
      @input="emit('seek', Number(($event.target as HTMLInputElement).value))"
    >
    <span class="shrink-0 font-mono text-xs tabular-nums text-paper-dim">
      {{ props.stepIndex + 1 }} / {{ props.traceLength }}
    </span>
  </div>
</template>

<style scoped>
.ctl {
  @apply rounded-md border border-ink-700 bg-ink-800 px-2.5 py-1.5 font-display text-sm text-paper transition-colors hover:border-live/60 hover:text-live;
}
</style>
