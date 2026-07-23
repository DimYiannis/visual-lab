<script setup lang="ts">
/**
 * Concurrency Lab — third sibling of the math workspace and Algorithm Lab.
 * Same shape: Python left, visualization right, playback below. Subject
 * here is deadlock: the naive dining-philosophers solution guarantees one,
 * the fixed version (asymmetric fork order) never hits it.
 */
import { useConcurrencyStore } from '~/stores/concurrency'
import PySourcePanel from '~/components/shared/PySourcePanel.vue'
import PhilosophersViz from '~/components/concurrency/PhilosophersViz.vue'
import BufferViz from '~/components/concurrency/BufferViz.vue'
import RWLockViz from '~/components/concurrency/RWLockViz.vue'
import ConcurrencyControls from '~/components/concurrency/ConcurrencyControls.vue'

const store = useConcurrencyStore()
const currentLine = computed(() => store.step?.line ?? 0)

useHead({ title: 'Concurrency Lab — Visual Math Workspace' })
</script>

<template>
  <main class="mx-auto flex h-full max-w-7xl flex-col gap-3 p-3 sm:p-4">
    <header class="flex items-baseline justify-between px-1">
      <h1 class="font-display text-lg font-700 tracking-tight text-paper">
        Concurrency <span class="text-live">Lab</span>
      </h1>
      <nav class="flex gap-4">
        <NuxtLink to="/algorithms" class="font-display text-xs text-paper-dim transition-colors hover:text-live">
          Algorithm Lab →
        </NuxtLink>
        <NuxtLink to="/structures" class="font-display text-xs text-paper-dim transition-colors hover:text-live">
          Data structures →
        </NuxtLink>
        <NuxtLink to="/" class="font-display text-xs text-paper-dim transition-colors hover:text-live">
          ← Math workspace
        </NuxtLink>
      </nav>
    </header>

    <div class="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <!-- Code (left) -->
      <section
        class="relative flex min-h-[320px] flex-col overflow-hidden rounded-xl bg-ink-950 shadow-panel"
        aria-label="Python source"
      >
        <header class="relative z-10 flex items-center justify-between px-4 pt-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-paper-dim">Code · Python</p>
            <h2 class="font-display text-sm font-600 text-paper">{{ store.con.label }}</h2>
          </div>
          <span
            class="rounded-full px-2.5 py-0.5 font-mono text-[11px]"
            :class="store.con.id.endsWith('naive') ? 'bg-danger/10 text-danger' : 'bg-match/10 text-match'"
          >
            {{ store.con.outcome }}
          </span>
        </header>
        <PySourcePanel :code="store.con.code" :current-line="currentLine" />
        <footer class="relative z-10 border-t border-ink-700/60 px-4 py-3">
          <p class="font-display text-xs leading-relaxed text-paper-dim">
            {{ store.con.lesson }}
          </p>
        </footer>
      </section>

      <!-- Visualization (right) -->
      <section
        class="graph-paper graph-paper-dark relative flex min-h-[360px] flex-col overflow-hidden rounded-xl px-3 pb-3 shadow-panel"
        aria-label="Concurrency scenario visualization"
      >
        <header class="relative z-10 flex items-center justify-between px-1 pt-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-paper-dim">Visualization</p>
            <h2 class="font-display text-sm font-600 text-paper">{{ store.con.tagline }}</h2>
          </div>
          <span
            v-if="store.state.done"
            class="rounded-full px-2.5 py-0.5 font-mono text-[11px]"
            :class="(store.state.deadlocked || store.state.overflowed || store.state.rwCorrupted) ? 'bg-danger/10 text-danger' : 'bg-match/10 text-match'"
          >
            {{ store.state.deadlocked ? 'deadlocked' : store.state.overflowed ? 'overflow' : store.state.rwCorrupted ? 'torn read' : 'done' }}
          </span>
        </header>

        <PhilosophersViz v-if="store.con.viz === 'philosophers'" :state="store.state" />
        <BufferViz v-else-if="store.con.viz === 'buffer'" :state="store.state" />
        <RWLockViz v-else :state="store.state" />

        <footer class="relative z-10 mt-2 border-t border-ink-700/60 px-1 pt-2">
          <p class="min-h-[20px] font-display text-sm text-paper" aria-live="polite">
            {{ store.step?.note }}
          </p>
        </footer>
      </section>
    </div>

    <ConcurrencyControls />
  </main>
</template>
