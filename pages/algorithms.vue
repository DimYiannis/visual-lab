<script setup lang="ts">
/**
 * Algorithm Lab — the DSA sibling of the math workspace.
 * Left: the Python source, current line highlighted.
 * Right: the data structure reacting, step by step.
 * Bottom: picker + transport. One algorithm, one idea at a time.
 */
import { useAlgoStore, ALGOS } from '~/stores/algorithms'
import AlgoCodePanel from '~/components/algo/AlgoCodePanel.vue'
import GraphViz from '~/components/algo/GraphViz.vue'
import ArrayViz from '~/components/algo/ArrayViz.vue'
import TreeViz from '~/components/algo/TreeViz.vue'
import ListViz from '~/components/algo/ListViz.vue'
import HashViz from '~/components/algo/HashViz.vue'
import LRUViz from '~/components/algo/LRUViz.vue'
import GridViz from '~/components/algo/GridViz.vue'
import MazeViz from '~/components/algo/MazeViz.vue'
import QueensViz from '~/components/algo/QueensViz.vue'
import AlgoControls from '~/components/algo/AlgoControls.vue'

const store = useAlgoStore()

// Deep links from the Data Structures page: /algorithms?algo=heap
const route = useRoute()
const requested = route.query.algo
if (typeof requested === 'string' && ALGOS.some(a => a.id === requested)) {
  store.selectAlgo(requested)
}

useHead({ title: 'Algorithm Lab — Visual Math Workspace' })
</script>

<template>
  <main class="mx-auto flex h-full max-w-7xl flex-col gap-3 p-3 sm:p-4">
    <header class="flex items-baseline justify-between px-1">
      <h1 class="font-display text-lg font-700 tracking-tight text-paper">
        Algorithm <span class="text-live">Lab</span>
      </h1>
      <nav class="flex gap-4">
        <NuxtLink
          to="/structures"
          class="font-display text-xs text-paper-dim transition-colors hover:text-live"
        >
          Data structures →
        </NuxtLink>
        <NuxtLink
          to="/concurrency"
          class="font-display text-xs text-paper-dim transition-colors hover:text-live"
        >
          Concurrency →
        </NuxtLink>
        <NuxtLink
          to="/"
          class="font-display text-xs text-paper-dim transition-colors hover:text-live"
        >
          ← Math workspace
        </NuxtLink>
      </nav>
    </header>

    <div class="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <!-- Code (left) — solid dark surface, no graph paper: code wants contrast -->
      <section
        class="relative flex min-h-[320px] flex-col overflow-hidden rounded-xl bg-ink-950 shadow-panel"
        aria-label="Python source"
      >
        <header class="relative z-10 flex items-center justify-between px-4 pt-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-paper-dim">Code · Python</p>
            <h2 class="font-display text-sm font-600 text-paper">{{ store.algo.label }}</h2>
          </div>
          <span class="rounded-full bg-live/10 px-2.5 py-0.5 font-mono text-[11px] text-live">
            {{ store.algo.complexity }}
          </span>
        </header>
        <AlgoCodePanel />
        <footer class="relative z-10 border-t border-ink-700/60 px-4 py-3">
          <p class="font-display text-xs leading-relaxed text-paper-dim">
            {{ store.algo.lesson }}
          </p>
        </footer>
      </section>

      <!-- Visualization (right) -->
      <section
        class="graph-paper relative flex min-h-[360px] flex-col overflow-hidden rounded-xl px-3 pb-3 shadow-panel"
        aria-label="Algorithm visualization"
      >
        <header class="relative z-10 flex items-center justify-between px-1 pt-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-paper-dim">Visualization</p>
            <h2 class="font-display text-sm font-600 text-paper">{{ store.algo.tagline }}</h2>
          </div>
          <span
            v-if="store.state.done"
            class="rounded-full bg-match/10 px-2.5 py-0.5 font-mono text-[11px] text-match"
          >
            done
          </span>
        </header>

        <GraphViz
          v-if="store.algo.viz === 'graph'"
          :graph="store.algoId === 'bellman-ford' ? store.bfGraph ?? store.graph : store.graph"
          :state="store.state"
          :frontier-label="store.algo.frontierLabel"
          :order-label="store.algo.orderLabel"
          :badge-label="store.algo.badgeLabel"
          :show-weights="store.algo.showWeights"
        />
        <ArrayViz
          v-else-if="store.algo.viz === 'array'"
          :state="store.state"
          :target="store.algoId === 'binary-search' ? store.target : null"
        />
        <TreeViz
          v-else-if="store.algo.viz === 'tree'"
          :state="store.state"
          :target="store.algoId === 'bst' ? store.target : store.algoId === 'trie' ? store.triePrefix : null"
          :order-label="store.algo.orderLabel"
        />
        <ListViz v-else-if="store.algo.viz === 'list'" :state="store.state" />
        <HashViz v-else-if="store.algo.viz === 'hash'" :state="store.state" />
        <LRUViz v-else-if="store.algo.viz === 'lru'" :state="store.state" />
        <GridViz v-else-if="store.algo.viz === 'grid'" :state="store.state" />
        <MazeViz v-else-if="store.algo.viz === 'maze'" :state="store.state" />
        <QueensViz v-else :state="store.state" />

        <footer class="relative z-10 mt-2 border-t border-ink-700/60 px-1 pt-2">
          <p class="min-h-[20px] font-display text-sm text-paper" aria-live="polite">
            {{ store.step?.note }}
          </p>
        </footer>
      </section>
    </div>

    <AlgoControls />
  </main>
</template>
