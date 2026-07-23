<script setup lang="ts">
/**
 * SeriesControls — pick a famous series and how many Taylor terms to sum
 * (series mode). Each base carries a one-line educational blurb; bases with a
 * finite radius of convergence say so, because watching divergence is the
 * whole lesson. No math here — the store owns the series catalogue.
 */
import { useWorkspaceStore, SERIES, MAX_TERMS, type SeriesBase } from '~/stores/workspace'

const store = useWorkspaceStore()

const bases = Object.entries(SERIES) as [SeriesBase, (typeof SERIES)[SeriesBase]][]
const current = computed(() => SERIES[store.seriesBase])

function onTermsInput(event: Event) {
  store.setSeriesTerms(Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Base function -->
    <div>
      <p class="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-paper-faint">Function</p>
      <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Series base function">
        <button
          v-for="[value, def] in bases"
          :key="value"
          role="radio"
          :aria-checked="store.seriesBase === value"
          class="rounded-md border px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-live"
          :class="
            store.seriesBase === value
              ? 'border-live bg-live/10 text-live'
              : 'border-ink-700 text-paper-dim hover:border-ink-600 hover:text-paper'
          "
          @click="store.setSeriesBase(value)"
        >
          {{ def.label }}
        </button>
      </div>
      <p class="mt-1.5 font-display text-xs text-paper-dim">
        {{ current.blurb }}
        <span v-if="current.radius !== null" class="text-goal">
          Converges only for |x| &lt; {{ current.radius }}.
        </span>
      </p>
    </div>

    <!-- Term count: each term hugs the curve a little longer -->
    <label class="block rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2.5">
      <span class="mb-1.5 flex items-baseline justify-between">
        <span class="font-mono text-sm text-paper">N <span class="text-paper-faint">terms</span></span>
        <span class="font-mono text-sm tabular-nums text-live">{{ store.seriesTerms }}</span>
      </span>
      <input
        type="range"
        :min="1"
        :max="MAX_TERMS"
        :step="1"
        :value="store.seriesTerms"
        aria-label="Number of series terms"
        @input="onTermsInput"
      />
      <span class="mt-1 flex justify-between font-mono text-[10px] text-paper-faint">
        <span>1</span>
        <span>{{ MAX_TERMS }}</span>
      </span>
    </label>
  </div>
</template>
