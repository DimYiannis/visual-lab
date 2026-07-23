<script setup lang="ts">
/**
 * Live Visualization (top-left).
 *
 * The curve is animated: each frame the displayed buffer eases toward the
 * store's freshly sampled points (requestAnimationFrame via useRafFn).
 * Math lives in the store; this panel only reacts and draws.
 *
 * Pointer overlay handles all interactions:
 *  - wheel: zoom toward the cursor (shared view — the goal panel follows)
 *  - drag: pan; near a handle it moves p/q (integrate, arclength) or the
 *    tangent probe (derive) instead — the Visualization → Store direction
 *  - double-click: reset the view
 *
 * The formula chip always shows the exact expression being computed for the
 * active paradigm: f(x), ∫ f dx, f′(x₀), Σ terms, or ∫ √(1+f′²) dx.
 */
import katex from 'katex'
import { useRafFn, usePreferredReducedMotion } from '@vueuse/core'
import { useWorkspaceStore, SAMPLES, SERIES } from '~/stores/workspace'
import { useGraphView } from '~/composables/useGraphView'
import CurveLine from '~/components/three/CurveLine.vue'
import GraphGrid from '~/components/three/GraphGrid.vue'
import RiemannRects from '~/components/three/RiemannRects.vue'
import BoundHandles from '~/components/three/BoundHandles.vue'
import TangentLine from '~/components/three/TangentLine.vue'
import ChordLine from '~/components/three/ChordLine.vue'

const store = useWorkspaceStore()
const reducedMotion = usePreferredReducedMotion()
const { view, pointerToWorld, worldPerPixel, zoomAt, panBy, reset, isHome } = useGraphView()

const liveCurve = ref<InstanceType<typeof CurveLine> | null>(null)

// Displayed points ease toward the target of the animation (the store's
// currentPoints). x and z never change — only y is interpolated.
const displayed = new Float32Array(SAMPLES * 3)
let initialized = false

useRafFn(() => {
  const goal = store.currentPoints
  if (!initialized) {
    displayed.set(goal)
    initialized = true
  }

  const ease = reducedMotion.value === 'reduce' ? 1 : 0.18
  for (let i = 1; i < displayed.length; i += 3) {
    const delta = goal[i] - displayed[i]
    displayed[i] = Math.abs(delta) > 1e-4 ? displayed[i] + delta * ease : goal[i]
  }
  // x coordinates are static per domain — keep them mirrored from the source
  for (let i = 0; i < displayed.length; i += 3) displayed[i] = goal[i]

  liveCurve.value?.setPoints(displayed)
})

const curveColor = computed(() => (store.isMatched ? '#7CFFB2' : '#4FD1FF'))

const panelTitle = computed(() => {
  switch (store.mode) {
    case 'integrate': return 'Area under your curve'
    case 'derive': return 'Slope along your curve'
    case 'series': return 'Partial sum vs the real thing'
    case 'arclength': return 'Length of your curve'
    default: return 'Your curve'
  }
})

// The formula being computed, per paradigm, with live values substituted.
const equationHtml = computed(() => {
  let tex = ''
  switch (store.mode) {
    case 'integrate':
      if (!store.latexSubstituted) return ''
      tex = `\\int_{${store.boundP.toFixed(1)}}^{${store.boundQ.toFixed(1)}} \\left( ${store.latexSubstituted} \\right) dx \\approx ${store.exactArea.toFixed(2)}`
      break
    case 'derive':
      tex = `f'(x_0) = \\lim_{h \\to 0}\\frac{f(x_0+h)-f(x_0)}{h} \\;\\Rightarrow\\; f'(${store.probeX.toFixed(1)}) \\approx ${store.probeSlope.toFixed(2)}`
      break
    case 'series': {
      const def = SERIES[store.seriesBase]
      tex = `${def.texName} \\approx ${def.texSum(def.kStart + store.seriesTerms - 1)}`
      break
    }
    case 'arclength':
      tex = `L = \\int_{${store.boundP.toFixed(1)}}^{${store.boundQ.toFixed(1)}} \\sqrt{1 + f'(x)^2}\\,dx \\approx ${store.exactLength.toFixed(2)}`
      break
    default:
      if (!store.latexSubstituted) return ''
      tex = `f(x) = ${store.latexSubstituted}`
  }
  try {
    return katex.renderToString(tex, { throwOnError: false })
  } catch {
    return ''
  }
})

/* ---------------------------------------------------------------------------
 * Pointer interactions: pan / zoom / handle dragging.
 * ------------------------------------------------------------------------ */
const GRAB_RADIUS = 0.6 // world units

const overlay = ref<HTMLElement | null>(null)
type DragMode = 'p' | 'q' | 'probe' | 'pan' | null
const dragging = ref<DragMode>(null)
const nearHandle = ref(false)
let lastClient = { x: 0, y: 0 }

function nearestHandle(worldX: number): 'p' | 'q' | 'probe' | null {
  if (store.mode === 'derive') {
    return Math.abs(worldX - store.probeX) <= GRAB_RADIUS ? 'probe' : null
  }
  if (store.mode !== 'integrate' && store.mode !== 'arclength') return null
  const dp = Math.abs(worldX - store.boundP)
  const dq = Math.abs(worldX - store.boundQ)
  if (Math.min(dp, dq) > GRAB_RADIUS) return null
  return dp <= dq ? 'p' : 'q'
}

function onPointerDown(event: PointerEvent) {
  const el = overlay.value
  if (!el) return
  const world = pointerToWorld(event, el)
  if (!world) return
  dragging.value = nearestHandle(world.x) ?? 'pan'
  lastClient = { x: event.clientX, y: event.clientY }
  el.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  const el = overlay.value
  if (!el) return

  if (dragging.value === 'p' || dragging.value === 'q') {
    const world = pointerToWorld(event, el)
    if (world) store.setBound(dragging.value, world.x)
    return
  }

  if (dragging.value === 'probe') {
    const world = pointerToWorld(event, el)
    if (world) store.setProbe(world.x)
    return
  }

  if (dragging.value === 'pan') {
    const scale = worldPerPixel(el)
    panBy(-(event.clientX - lastClient.x) * scale, (event.clientY - lastClient.y) * scale)
    lastClient = { x: event.clientX, y: event.clientY }
    return
  }

  const world = pointerToWorld(event, el)
  nearHandle.value = world !== null && nearestHandle(world.x) !== null
}

function onPointerUp(event: PointerEvent) {
  if (dragging.value) overlay.value?.releasePointerCapture(event.pointerId)
  dragging.value = null
}

function onWheel(event: WheelEvent) {
  const el = overlay.value
  if (!el) return
  zoomAt(event.deltaY > 0 ? 1.1 : 1 / 1.1, event, el)
}

const cursorClass = computed(() => {
  if (dragging.value && dragging.value !== 'pan') return 'cursor-ew-resize'
  if (dragging.value === 'pan') return 'cursor-grabbing'
  if (nearHandle.value) return 'cursor-ew-resize'
  return 'cursor-grab'
})

const errorValue = computed(() =>
  store.mode === 'arclength'
    ? Math.abs(store.approxLength - store.exactLength)
    : Math.abs(store.approxArea - store.exactArea),
)
</script>

<template>
  <section
    class="graph-paper graph-paper-dark relative flex flex-col overflow-hidden rounded-xl shadow-panel"
    aria-label="Live visualization"
  >
    <header class="pointer-events-none relative z-10 flex items-center justify-between px-4 pt-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.18em] text-paper-dim">Live</p>
        <h2 class="font-display text-sm font-600 text-paper">{{ panelTitle }}</h2>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="!isHome"
          class="pointer-events-auto rounded-full border border-ink-700 px-2.5 py-0.5 font-mono text-[11px] text-paper-dim transition-colors hover:border-live hover:text-live"
          @click="reset()"
        >
          reset view
        </button>
        <span
          class="rounded-full px-2.5 py-0.5 font-mono text-[11px] transition-colors"
          :class="store.isMatched ? 'bg-match/15 text-match' : 'bg-live/10 text-live'"
        >
          {{ store.isMatched ? 'matched' : 'live' }}
        </span>
      </div>
    </header>

    <!-- The formula this paradigm computes, with live values substituted -->
    <div class="pointer-events-none relative z-10 px-4 pt-1.5">
      <div
        class="inline-block rounded-md border border-ink-700/60 bg-ink-900/80 px-2.5 py-1 text-paper [&_.katex]:text-[15px]"
        v-html="equationHtml"
      />
    </div>

    <ClientOnly>
      <!-- Opaque near-black clear color: guarantees a dark plot area even
           where canvas transparency misbehaves (user request, 2026-07-23) -->
      <TresCanvas clear-color="#080D1A" class="!absolute inset-0 !bg-ink-950">
        <TresPerspectiveCamera
          :position="[view.x, view.y, view.z]"
          :fov="60"
          :look-at="[view.x, view.y, 0]"
        />
        <GraphGrid />
        <!-- One diagram at a time: the curve + ONLY the active paradigm's apparatus -->
        <template v-if="store.mode === 'integrate'">
          <RiemannRects />
          <BoundHandles />
        </template>
        <TangentLine v-else-if="store.mode === 'derive'" />
        <template v-else-if="store.mode === 'arclength'">
          <ChordLine />
          <BoundHandles />
        </template>
        <!-- The user's animated curve (the partial sum, in series mode) -->
        <CurveLine ref="liveCurve" :color="curveColor" />
      </TresCanvas>
    </ClientOnly>

    <!-- Interaction surface: pan / zoom everywhere, handles per mode -->
    <div
      ref="overlay"
      class="absolute inset-0 z-[5] touch-none"
      :class="cursorClass"
      aria-hidden="true"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
      @dblclick="reset()"
    />

    <!-- Spacer keeps the canvas area sized; canvas itself is absolute -->
    <div class="min-h-[220px] flex-1" />

    <!-- Approx vs exact: the error visibly shrinks as n grows -->
    <footer
      v-if="store.mode === 'integrate' || store.mode === 'arclength'"
      class="pointer-events-none relative z-10 mx-4 mb-3 flex items-end justify-between rounded-md border border-ink-700/60 bg-ink-900/80 px-3 py-2 font-mono text-xs"
    >
      <div v-if="store.mode === 'integrate'">
        <p class="text-paper">
          Riemann · n={{ store.rectCount }} · {{ store.method }}
          <span class="ml-2 tabular-nums text-live">{{ store.approxArea.toFixed(3) }}</span>
        </p>
        <p class="text-paper-dim">
          Exact (Simpson)
          <span class="ml-2 tabular-nums text-paper">{{ store.exactArea.toFixed(3) }}</span>
        </p>
      </div>
      <div v-else>
        <p class="text-paper">
          Chords · n={{ store.rectCount }}
          <span class="ml-2 tabular-nums text-derived">{{ store.approxLength.toFixed(3) }}</span>
        </p>
        <p class="text-paper-dim">
          Exact (Simpson)
          <span class="ml-2 tabular-nums text-paper">{{ store.exactLength.toFixed(3) }}</span>
        </p>
      </div>
      <p class="text-paper-dim">
        error <span class="tabular-nums text-paper">{{ errorValue.toFixed(3) }}</span>
      </p>
    </footer>

    <!-- Derive mode: the probe's numbers -->
    <footer
      v-else-if="store.mode === 'derive'"
      class="pointer-events-none relative z-10 mx-4 mb-3 flex items-center gap-4 rounded-md border border-ink-700/60 bg-ink-900/80 px-3 py-2 font-mono text-xs"
    >
      <p class="text-paper-dim">
        x₀ <span class="tabular-nums text-paper">{{ store.probeX.toFixed(2) }}</span>
      </p>
      <p class="text-paper-dim">
        f(x₀) <span class="tabular-nums text-live">{{ store.probeY.toFixed(2) }}</span>
      </p>
      <p class="text-paper-dim">
        f′(x₀) <span class="tabular-nums text-derived">{{ store.probeSlope.toFixed(2) }}</span>
      </p>
      <p class="ml-auto font-display text-paper-faint">drag the dot</p>
    </footer>
  </section>
</template>
