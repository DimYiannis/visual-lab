<script setup lang="ts">
/**
 * Producer-consumer visualization: producers on the left feeding a bounded
 * buffer, a consumer on the right draining it. `TransitionGroup` (keyed by
 * item id) gets items sliding into and out of the buffer for free — same
 * trick as the LRU cache cards.
 */
import type { ConcurrencyStepState } from '~/stores/concurrency'

const props = defineProps<{ state: ConcurrencyStepState }>()

function slotClass(i: number): string {
  const s = props.state
  if (s.overflowed && i >= s.bufCap) return 'border-danger bg-danger/20 text-danger'
  if (i < s.buffer.length) return 'border-live bg-live/15 text-live'
  return 'border-ink-700 bg-ink-900 text-transparent'
}

function producerClass(id: number): string {
  const s = props.state
  if (s.activeActor === `P${id}`) return 'border-goal bg-goal/15 text-goal'
  const p = s.producers.find(x => x.id === id)
  return p?.done ? 'border-derived/50 bg-derived/10 text-derived' : 'border-ink-600 bg-ink-800 text-paper-dim'
}

const consumerClass = computed(() =>
  props.state.activeActor === 'C' ? 'border-goal bg-goal/15 text-goal' : 'border-ink-600 bg-ink-800 text-paper-dim',
)

/** How many slots to draw: capacity, plus one extra if it just overflowed. */
const slotCount = computed(() => props.state.bufCap + (props.state.overflowed ? 1 : 0))
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-2 pt-1">
    <div class="flex w-full items-center justify-center gap-6">
      <!-- Producers -->
      <div class="flex flex-col gap-2">
        <div
          v-for="p in state.producers"
          :key="p.id"
          class="flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors"
          :class="producerClass(p.id)"
        >
          <span class="font-semibold">P{{ p.id }}</span>
          <span class="text-[11px] opacity-80">{{ p.produced }}/{{ p.target }}</span>
        </div>
      </div>

      <span class="font-mono text-lg text-paper-faint">→</span>

      <!-- Buffer -->
      <div class="flex flex-col items-center gap-1.5">
        <div class="flex gap-1.5">
          <TransitionGroup name="buf-item">
            <div
              v-for="(item, i) in state.buffer"
              :key="item"
              class="flex h-11 w-11 items-center justify-center rounded border-2 font-mono text-sm font-semibold transition-colors"
              :class="slotClass(i)"
            >
              {{ item }}
            </div>
          </TransitionGroup>
          <div
            v-for="i in Math.max(0, slotCount - state.buffer.length)"
            :key="`empty-${i}`"
            class="flex h-11 w-11 items-center justify-center rounded border-2 border-dashed"
            :class="state.overflowed && state.buffer.length + i - 1 >= state.bufCap ? 'border-danger/50' : 'border-ink-700'"
          />
        </div>
        <p class="font-mono text-[11px] text-paper-faint">
          {{ state.buffer.length }} / {{ state.bufCap }}
        </p>
      </div>

      <span class="font-mono text-lg text-paper-faint">→</span>

      <!-- Consumer -->
      <div
        class="flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors"
        :class="consumerClass"
      >
        <span class="font-semibold">C</span>
        <span class="text-[11px] opacity-80">{{ state.consumed }}/{{ state.totalItems }}</span>
      </div>
    </div>

    <p v-if="state.overflowed" class="font-display text-sm font-semibold text-danger">
      buffer overflow
    </p>
    <p class="font-display text-[11px] text-paper-faint">
      amber = acting this step · cyan = item in buffer · violet = producer finished · red = overflow
    </p>
  </div>
</template>

<style scoped>
.buf-item-move {
  transition: transform 0.3s ease;
}
.buf-item-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.buf-item-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}
.buf-item-leave-active {
  transition: opacity 0.2s ease;
  position: absolute;
}
.buf-item-leave-to {
  opacity: 0;
}
</style>
