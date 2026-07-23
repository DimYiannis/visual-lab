<script setup lang="ts">
import { useWorkspaceStore } from '~/stores/workspace'

const store = useWorkspaceStore()
const percent = computed(() => Math.round(store.matchScore * 100))
</script>

<template>
  <div
    class="flex items-center gap-3"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="Match score"
  >
    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
      <div
        class="h-full rounded-full transition-[width,background-color] duration-200 ease-out"
        :class="store.isMatched ? 'bg-match shadow-glowMatch' : 'bg-goal'"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <span
      class="w-11 text-right font-mono text-xs tabular-nums"
      :class="store.isMatched ? 'text-match' : 'text-paper-dim'"
    >
      {{ percent }}%
    </span>
  </div>
</template>
