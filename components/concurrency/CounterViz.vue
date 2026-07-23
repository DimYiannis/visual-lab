<script setup lang="ts">
/**
 * Lost-update counter visualization: the shared counter front and center,
 * two thread chips showing what each last read into its local variable.
 * Unlike every other scenario in this lab, nothing here ever turns red
 * mid-run — the naive bug is invisible until the final tally, which is
 * the whole point (a silent race, not a loud one).
 */
import type { ConcurrencyStepState } from '~/stores/concurrency'

const props = defineProps<{ state: ConcurrencyStepState }>()

const valueClass = computed(() => {
  if (!props.state.done) return 'text-live'
  return props.state.counterLost > 0 ? 'text-danger' : 'text-match'
})

function threadClass(id: number): string {
  const s = props.state
  if (s.activeActor === `T${id}`) return 'border-goal bg-goal/15 text-goal'
  const t = s.counterThreads.find(x => x.id === id)
  return t && t.done >= t.target ? 'border-derived/50 bg-derived/10 text-derived' : 'border-ink-600 bg-ink-800 text-paper-dim'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-2 pt-1">
    <div class="flex flex-col items-center gap-1">
      <p class="font-mono text-6xl font-bold tabular-nums transition-colors" :class="valueClass">
        {{ state.counterValue }}
      </p>
      <p class="font-display text-[11px] text-paper-faint">
        shared counter · expected {{ state.counterExpected }}
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <div
        v-for="t in state.counterThreads"
        :key="t.id"
        class="flex flex-col items-center gap-1 rounded-md border px-3 py-2 font-mono text-[12px] transition-colors"
        :class="threadClass(t.id)"
      >
        <span class="font-semibold">T{{ t.id }}</span>
        <span class="text-[11px] opacity-80">{{ t.done }}/{{ t.target }} done</span>
        <span v-if="t.phase === 'read'" class="text-[10px] opacity-70">holding local = {{ t.local }}</span>
      </div>
    </div>

    <p v-if="state.done" class="font-display text-sm font-semibold" :class="state.counterLost > 0 ? 'text-danger' : 'text-match'">
      {{ state.counterLost > 0 ? `${state.counterLost} update${state.counterLost === 1 ? '' : 's'} lost` : 'nothing lost' }}
    </p>
    <p class="font-display text-[11px] text-paper-faint">
      amber = acting this step · violet = finished · a lost update never turns anything red until the end
    </p>
  </div>
</template>
