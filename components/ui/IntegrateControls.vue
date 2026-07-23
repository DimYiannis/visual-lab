<script setup lang="ts">
/**
 * IntegrateControls — Riemann sum / arc-length controls. Method picker
 * (integrate only — chords have no method) + count n (rectangles or
 * segments). Bounds p and q are dragged directly in the live panel; they're
 * shown here read-only so the numbers have a home. All writes go through
 * store actions — no math in this component.
 */
import { useWorkspaceStore, MAX_RECTS, type RiemannMethod } from '~/stores/workspace'

const store = useWorkspaceStore()
const noun = computed(() => (store.mode === 'arclength' ? 'segments' : 'rectangles'))

const methods: { value: RiemannMethod; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'midpoint', label: 'Midpoint' },
  { value: 'trapezoid', label: 'Trapezoid' },
]

function onCountInput(event: Event) {
  store.setRectCount(Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Method (Riemann sums only) -->
    <div v-if="store.mode === 'integrate'">
      <p class="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-paper-faint">Method</p>
      <div class="flex gap-1.5" role="radiogroup" aria-label="Riemann sum method">
        <button
          v-for="m in methods"
          :key="m.value"
          role="radio"
          :aria-checked="store.method === m.value"
          class="rounded-md border px-2.5 py-1 font-display text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-live"
          :class="
            store.method === m.value
              ? 'border-live bg-live/10 text-live'
              : 'border-ink-700 text-paper-dim hover:border-ink-600 hover:text-paper'
          "
          @click="store.setMethod(m.value)"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <!-- Rectangle count: crank n, watch rectangles melt into the region -->
    <label class="block rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2.5">
      <span class="mb-1.5 flex items-baseline justify-between">
        <span class="font-mono text-sm text-paper">n <span class="text-paper-faint">{{ noun }}</span></span>
        <span class="font-mono text-sm tabular-nums text-live">{{ store.rectCount }}</span>
      </span>
      <input
        type="range"
        :min="1"
        :max="MAX_RECTS"
        :step="1"
        :value="store.rectCount"
        :aria-label="`Number of ${noun}`"
        @input="onCountInput"
      />
      <span class="mt-1 flex justify-between font-mono text-[10px] text-paper-faint">
        <span>1</span>
        <span>{{ MAX_RECTS }}</span>
      </span>
    </label>

    <!-- Bounds readout (drag the handles in the live panel to change them) -->
    <p class="font-mono text-xs text-paper-faint">
      p = <span class="tabular-nums text-paper-dim">{{ store.boundP.toFixed(2) }}</span>
      <span class="mx-2">·</span>
      q = <span class="tabular-nums text-paper-dim">{{ store.boundQ.toFixed(2) }}</span>
      <span class="ml-2 font-display normal-case">— drag the handles in the live panel</span>
    </p>
  </div>
</template>
