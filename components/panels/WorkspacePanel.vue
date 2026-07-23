<script setup lang="ts">
/**
 * Symbolic Workspace (bottom).
 *
 * Equation editor + KaTeX rendering + sliders that are generated
 * automatically from the free symbols found in the expression.
 * Data flow: input → store → visualization. This panel never
 * computes geometry.
 *
 * Also hosts the paradigm switcher (each mode = one famous mathematical
 * idea, with a one-line lesson), the famous-equation presets, and the
 * per-mode controls (Riemann/arc-length counts, series terms).
 */
import katex from 'katex'
import { refDebounced } from '@vueuse/core'
import { useWorkspaceStore, MODES } from '~/stores/workspace'
import ParamSlider from '~/components/ui/ParamSlider.vue'
import IntegrateControls from '~/components/ui/IntegrateControls.vue'
import SeriesControls from '~/components/ui/SeriesControls.vue'
import PresetPicker from '~/components/ui/PresetPicker.vue'

const store = useWorkspaceStore()

// Local draft so typing doesn't recompile on every keystroke.
const draft = ref(store.expression)
const draftDebounced = refDebounced(draft, 250)
watch(draftDebounced, (value) => store.setExpression(value))
// Keep the field in sync if the expression changes from elsewhere.
watch(
  () => store.expression,
  (value) => {
    if (value !== draft.value) draft.value = value
  },
)

function renderTex(tex: string): string {
  if (!tex) return ''
  try {
    return katex.renderToString(`f(x) = ${tex}`, { throwOnError: false, displayMode: true })
  } catch {
    return ''
  }
}

const symbolicHtml = computed(() => renderTex(store.latex))
const substitutedHtml = computed(() => renderTex(store.latexSubstituted))

const activeMode = computed(() => MODES.find((m) => m.value === store.mode) ?? MODES[0])
// Series mode replaces the free-form equation with the series catalogue.
const usesExpression = computed(() => store.mode !== 'series')
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-xl bg-ink-900 p-4 shadow-panel"
    aria-label="Symbolic workspace"
  >
    <!-- Paradigm switcher + educational context -->
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div
          class="flex flex-wrap overflow-hidden rounded-md border border-ink-700"
          role="radiogroup"
          aria-label="Workspace mode"
        >
          <button
            v-for="m in MODES"
            :key="m.value"
            role="radio"
            :aria-checked="store.mode === m.value"
            :title="m.tagline"
            class="px-3 py-1 font-display text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-live"
            :class="
              store.mode === m.value
                ? 'bg-live/10 text-live'
                : 'text-paper-dim hover:text-paper'
            "
            @click="store.setMode(m.value)"
          >
            {{ m.label }}
          </button>
        </div>
        <button
          class="rounded-md border border-ink-700 px-3 py-1 font-display text-xs text-paper-dim transition-colors hover:border-live hover:text-live focus-visible:outline focus-visible:outline-2 focus-visible:outline-live"
          :class="{ 'animate-pulse-match border-match text-match': store.isMatched }"
          @click="store.newTarget()"
        >
          New target
        </button>
      </div>
      <!-- One idea per paradigm — the concept in plain words -->
      <p class="font-display text-xs leading-relaxed text-paper-dim">
        <span class="font-600 text-paper">{{ activeMode.tagline }}.</span>
        {{ activeMode.lesson }}
      </p>
    </div>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <!-- Equation editor (all modes except series, which picks from the catalogue) -->
      <div v-if="usesExpression" class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] uppercase tracking-[0.18em] text-paper-faint">Equation</p>
          <PresetPicker />
        </div>

        <input
          v-model="draft"
          type="text"
          spellcheck="false"
          autocomplete="off"
          aria-label="Function of x"
          class="w-full rounded-lg border bg-ink-800 px-3 py-2 font-mono text-sm text-paper outline-none transition-colors focus:border-live"
          :class="store.parseError ? 'border-danger' : 'border-ink-700'"
        />
        <p v-if="store.parseError" class="font-mono text-xs text-danger" role="alert">
          {{ store.parseError }}
        </p>

        <!-- Rendered math: symbolic form, then with current values substituted -->
        <div class="mt-1 rounded-lg border border-ink-700 bg-ink-800/40 px-3 py-1.5">
          <div class="overflow-x-auto text-[15px]" v-html="symbolicHtml" />
          <div class="overflow-x-auto border-t border-ink-700/60 text-sm text-paper-dim" v-html="substitutedHtml" />
        </div>
      </div>

      <!-- Series mode: base function + term count -->
      <div v-if="store.mode === 'series'" class="flex-1">
        <SeriesControls />
      </div>

      <!-- Riemann sum / arc-length controls -->
      <div v-if="store.mode === 'integrate' || store.mode === 'arclength'" class="lg:w-[26%]">
        <IntegrateControls />
      </div>

      <!-- Auto-generated sliders (series mode has none — its knob is N) -->
      <div v-if="usesExpression" :class="store.mode === 'match' ? 'lg:w-[46%]' : 'lg:w-[30%]'">
        <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-paper-faint">
          Parameters
          <span class="normal-case tracking-normal text-paper-faint/70">— generated from the equation</span>
        </p>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ParamSlider v-for="name in store.paramNames" :key="name" :name="name" />
        </div>
        <p v-if="store.paramNames.length === 0" class="font-display text-sm text-paper-dim">
          Add a symbol besides <span class="font-mono">x</span> (like
          <span class="font-mono">a</span>) and a slider appears here.
        </p>
      </div>
    </div>
  </section>
</template>
