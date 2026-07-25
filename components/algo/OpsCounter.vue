<script setup lang="ts">
/**
 * Live operation counters — the thing that turns "bubble sort is O(n²)"
 * from a claim into something you watch happen. Ticks up in real time as
 * the trace plays; scrubbing backward makes it tick back down, since it's
 * just reading straight off the current step's cumulative state.
 */
defineProps<{
  labels: [string, string]
  opsA: number
  opsB: number
}>()
</script>

<template>
  <div
    v-if="labels[0] || labels[1]"
    class="relative z-10 flex flex-wrap items-center gap-3 border-t border-ink-700/60 px-4 py-2"
  >
    <div v-if="labels[0]" class="flex items-baseline gap-1.5 font-mono text-xs">
      <span class="text-sm font-semibold tabular-nums text-live">{{ opsA }}</span>
      <span class="text-paper-faint">{{ labels[0] }}</span>
    </div>
    <div v-if="labels[1]" class="flex items-baseline gap-1.5 font-mono text-xs">
      <span class="text-sm font-semibold tabular-nums text-derived">{{ opsB }}</span>
      <span class="text-paper-faint">{{ labels[1] }}</span>
    </div>
  </div>
</template>
