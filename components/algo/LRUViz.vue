<script setup lang="ts">
/**
 * LRU cache visualization: the ordered list, most-recently-used on the
 * left, drawn as cards. A dashed line marks the capacity boundary. Because
 * `lruList` is keyed by `key` and TransitionGroup animates enter/leave/move,
 * reordering (a get moving a card to the front) and eviction (a card
 * dropping off the end) both read as motion for free — no manual animation.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{ state: StepState }>()

function cardClass(key: number): string {
  if (props.state.done) return 'border-match/50 bg-match/10 text-match'
  if (props.state.lruEvicted === key) return 'border-danger/60 bg-danger/10 text-danger'
  if (props.state.lruList[0]?.key === key) return 'border-live bg-live/10 text-live'
  return 'border-ink-600 bg-ink-800 text-paper'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 px-2 pt-2">
    <!-- Upcoming operations -->
    <div class="flex min-h-[30px] items-center gap-2">
      <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">next ops</span>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="(op, i) in state.opsQueue"
          :key="`${i}-${op}`"
          class="rounded border px-2 py-0.5 font-mono text-[12px] transition-colors"
          :class="i === 0 ? 'border-goal bg-goal/15 text-goal' : 'border-ink-600 bg-ink-800 text-paper-dim'"
        >
          {{ op }}
        </span>
        <span v-if="!state.opsQueue.length" class="font-mono text-[12px] text-paper-faint">none</span>
      </div>
    </div>

    <!-- MRU → LRU cards -->
    <div class="flex min-h-0 flex-1 items-center justify-center">
      <div class="flex items-end gap-2">
        <TransitionGroup name="lru-card" tag="div" class="flex items-end gap-2">
          <div
            v-for="(n, i) in state.lruList"
            :key="n.key"
            class="relative flex flex-col items-center"
          >
            <div
              class="flex h-16 w-20 flex-col items-center justify-center gap-0.5 rounded-lg border-2 font-mono transition-colors"
              :class="cardClass(n.key)"
            >
              <span class="text-[10px] opacity-70">key {{ n.key }}</span>
              <span class="text-lg font-semibold">{{ n.value }}</span>
            </div>
            <span
              v-if="i === state.lruCap - 1"
              class="absolute -right-[18px] top-0 bottom-0 border-r-2 border-dashed border-goal/40"
            />
          </div>
        </TransitionGroup>
        <div
          v-if="state.lruEvicted !== null"
          class="flex h-16 w-20 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-danger/60 bg-danger/10 font-mono text-danger"
        >
          <span class="text-[10px] opacity-70">evicted</span>
          <span class="text-lg font-semibold">{{ state.lruEvicted }}</span>
        </div>
      </div>
    </div>
    <p class="pb-1 text-center font-display text-[11px] text-paper-faint">
      most recently used ← → least recently used · dashed line = capacity ({{ state.lruCap }})
    </p>

    <!-- Operation history -->
    <div class="flex min-h-[26px] flex-wrap items-center gap-1.5 border-t border-ink-700/60 pt-2">
      <span
        v-for="(entry, i) in state.opsLog"
        :key="i"
        class="rounded border px-1.5 py-0.5 font-mono text-[11px]"
        :class="entry.includes('miss')
          ? 'border-danger/40 bg-danger/5 text-danger'
          : entry.includes('evicted')
            ? 'border-goal/40 bg-goal/5 text-goal'
            : 'border-ink-600 bg-ink-800 text-paper-dim'"
      >
        {{ entry }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.lru-card-move {
  transition: transform 0.35s ease;
}
.lru-card-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.lru-card-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.lru-card-leave-active {
  transition: opacity 0.2s ease;
  position: absolute;
}
.lru-card-leave-to {
  opacity: 0;
}
</style>
