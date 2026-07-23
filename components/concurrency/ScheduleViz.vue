<script setup lang="ts">
/**
 * Priority-scheduling visualization: two thread bars (progress toward
 * target) plus a recent-history strip showing who actually got picked
 * tick by tick — that strip is where "LOW never appears" or "LOW appears
 * once every ~10 ticks" reads at a glance.
 */
import type { ConcurrencyStepState } from '~/stores/concurrency'

const props = defineProps<{ state: ConcurrencyStepState }>()

function barColor(id: string): string {
  return id === 'HIGH' ? 'bg-live' : 'bg-goal'
}

const recentHistory = computed(() => props.state.schedHistory.slice(-20))

/** HIGH: share of all ticks it has won so far. LOW: literal progress to target. */
function barWidth(t: { id: string; done: number; target: number }): number {
  if (t.id === 'LOW') return Math.min(100, (t.done / t.target) * 100)
  return props.state.schedTick > 0 ? Math.min(100, (t.done / props.state.schedTick) * 100) : 0
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-3 pt-1">
    <div class="flex w-full max-w-sm flex-col gap-3">
      <div v-for="t in state.schedThreads" :key="t.id" class="flex flex-col gap-1">
        <div class="flex items-center justify-between font-mono text-[12px]">
          <span class="font-semibold" :class="t.id === 'HIGH' ? 'text-live' : 'text-goal'">{{ t.id }}</span>
          <span class="text-paper-dim">
            {{ t.done }}{{ t.id === 'LOW' ? `/${t.target}` : ' runs' }}
            <span class="text-paper-faint"> · pri {{ t.base }}{{ t.effective !== t.base ? ` (eff ${t.effective})` : '' }}</span>
          </span>
        </div>
        <div class="h-2.5 w-full overflow-hidden rounded-full bg-ink-800">
          <div
            class="h-full rounded-full transition-all duration-200"
            :class="barColor(t.id)"
            :style="{ width: `${barWidth(t)}%` }"
          />
        </div>
      </div>
    </div>

    <div class="flex w-full max-w-sm flex-col items-center gap-1.5">
      <p class="font-display text-[11px] uppercase tracking-wider text-paper-faint">who ran (last 20 ticks)</p>
      <div class="flex flex-wrap justify-center gap-1">
        <span
          v-for="(id, i) in recentHistory"
          :key="i"
          class="flex h-6 w-6 items-center justify-center rounded text-[10px] font-mono font-semibold"
          :class="id === 'HIGH' ? 'bg-live/20 text-live' : 'bg-goal/25 text-goal'"
        >
          {{ id[0] }}
        </span>
        <span v-if="!recentHistory.length" class="font-mono text-[12px] text-paper-faint">—</span>
      </div>
    </div>

    <p class="font-display text-[11px] text-paper-faint">
      tick {{ state.schedTick }} · cyan = HIGH ran · amber = LOW ran
    </p>
  </div>
</template>
