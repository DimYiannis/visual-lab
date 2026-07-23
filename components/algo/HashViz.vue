<script setup lang="ts">
/**
 * Hash-table visualization: seven bucket columns, chains growing downward.
 * Pending keys wait in a row on top; the active key + its computed bucket
 * light up amber, so the "one jump, no scanning" idea is visible. Chains
 * longer than one are the collision lesson.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{ state: StepState }>()

function keyChipClass(k: number): string {
  return props.state.activeKey === k
    ? 'border-goal bg-goal/15 text-goal'
    : 'border-ink-600 bg-ink-800 text-paper-dim'
}

function cellClass(b: number, k: number): string {
  if (props.state.done) return 'border-match/50 bg-match/10 text-match'
  if (props.state.activeBucket === b && props.state.activeKey === k)
    return 'border-goal bg-goal/15 text-goal'
  return 'border-ink-600 bg-ink-800 text-paper'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 px-2 pt-2">
    <!-- Keys waiting to be inserted -->
    <div class="flex min-h-[30px] items-center gap-2">
      <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">incoming</span>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="k in state.pendingKeys"
          :key="k"
          class="rounded border px-2 py-0.5 font-mono text-[13px] transition-colors"
          :class="keyChipClass(k)"
        >
          {{ k }}
        </span>
        <span v-if="!state.pendingKeys.length" class="font-mono text-[12px] text-paper-faint">none</span>
      </div>
    </div>

    <!-- Buckets -->
    <div
      class="grid min-h-0 flex-1 content-start gap-2"
      :style="{ gridTemplateColumns: `repeat(${state.buckets.length || 1}, minmax(0, 1fr))` }"
      role="img"
      aria-label="Hash table buckets with chained keys"
    >
      <div v-for="(chain, b) in state.buckets" :key="b" class="flex flex-col items-stretch gap-1.5">
        <div
          class="rounded-t-md border-b-2 pb-1 text-center font-mono text-[12px] transition-colors"
          :class="state.activeBucket === b ? 'border-goal text-goal' : 'border-ink-600 text-paper-faint'"
        >
          {{ b }}
        </div>
        <span
          v-for="k in chain"
          :key="k"
          class="rounded border px-1 py-1.5 text-center font-mono text-[13px] transition-colors"
          :class="cellClass(b, k)"
        >
          {{ k }}
        </span>
      </div>
    </div>
  </div>
</template>
