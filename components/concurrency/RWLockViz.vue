<script setup lang="ts">
/**
 * Readers-writers visualization: one shared value front and center (big,
 * so its parity is legible at a glance), readers and the writer as small
 * actor chips, a scrollable read log underneath so a torn read is visible
 * both as it happens and in the trail leading up to it.
 */
import type { ConcurrencyStepState } from '~/stores/concurrency'

const props = defineProps<{ state: ConcurrencyStepState }>()

const valueClass = computed(() => {
  const s = props.state
  if (s.rwCorrupted) return 'text-danger'
  return s.rwValue % 2 === 0 ? 'text-live' : 'text-goal'
})

function readerClass(id: number): string {
  const s = props.state
  if (s.activeActor === `R${id}`) return 'border-goal bg-goal/15 text-goal'
  const r = s.rwReaders.find(x => x.id === id)
  return r && r.done >= r.target ? 'border-derived/50 bg-derived/10 text-derived' : 'border-ink-600 bg-ink-800 text-paper-dim'
}

const writerClass = computed(() =>
  props.state.activeActor === 'W' ? 'border-goal bg-goal/15 text-goal' : 'border-ink-600 bg-ink-800 text-paper-dim',
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-2 pt-1">
    <div class="flex flex-col items-center gap-1">
      <p class="font-mono text-6xl font-bold tabular-nums transition-colors" :class="valueClass">
        {{ state.rwValue }}
      </p>
      <p class="font-display text-[11px] text-paper-faint">
        shared value · invariant: always even
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <div
        v-for="r in state.rwReaders"
        :key="r.id"
        class="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors"
        :class="readerClass(r.id)"
      >
        <span class="font-semibold">R{{ r.id }}</span>
        <span class="text-[11px] opacity-80">{{ r.done }}/{{ r.target }}</span>
      </div>
      <div
        class="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors"
        :class="writerClass"
      >
        <span class="font-semibold">W</span>
        <span class="text-[11px] opacity-80">{{ state.rwWriterDone }}/{{ state.rwWriterTarget }}</span>
      </div>
    </div>

    <div class="flex max-h-24 w-full max-w-sm flex-wrap items-start justify-center gap-1 overflow-y-auto">
      <span
        v-for="(entry, i) in state.rwLog"
        :key="i"
        class="rounded border px-1.5 py-0.5 font-mono text-[11px]"
        :class="entry.includes('✗')
          ? 'border-danger/50 bg-danger/10 text-danger'
          : 'border-ink-600 bg-ink-800 text-paper-dim'"
      >
        {{ entry }}
      </span>
    </div>

    <p class="font-display text-[11px] text-paper-faint">
      amber = acting this step · violet = finished its quota · red = torn read
    </p>
  </div>
</template>
