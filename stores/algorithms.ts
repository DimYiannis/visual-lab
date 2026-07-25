import { defineStore, acceptHMRUpdate } from 'pinia'

/* ---------------------------------------------------------------------------
 * Algorithm Lab store — the DSA sibling of the math workspace.
 *
 * Same philosophy, different subject: the user watches Python execute.
 * There is no interpreter — each catalogue entry pairs the *displayed*
 * Python source with a TypeScript twin that runs the algorithm and records
 * a trace: one step per interesting line, each step a full snapshot of the
 * algorithm's state. The code panel highlights the step's line, the
 * visualization renders the step's state, and playback is just an index
 * into the trace. Adding an algorithm = adding one catalogue entry + one
 * runner; the page never changes.
 *
 * Split across lib/algorithms/: types.ts (StepState/AlgoDef/etc), graph.ts
 * (Graph + generation), random.ts (shared randomness helpers), catalogue.ts
 * (ALGOS — pure data), runners/* (one file per category). This file is just
 * state + playback wiring — re-exports the handful of symbols (StepState,
 * Graph, ALGOS) that components still import from '~/stores/algorithms' so
 * nothing else in the app had to change its import path.
 * ------------------------------------------------------------------------ */

import type { StepState, AlgoStep } from '~/lib/algorithms/types'
import { emptyState, SORT_SIZE, SEARCH_SIZE } from '~/lib/algorithms/types'
import type { Graph } from '~/lib/algorithms/graph'
import { randomDAG, withOneNegativeEdge } from '~/lib/algorithms/graph'
import { randomValues, pickTarget } from '~/lib/algorithms/random'
import { ALGOS } from '~/lib/algorithms/catalogue'

import { runKahn, runBFS, runDFS, runDijkstra, runKruskal, runBellmanFord } from '~/lib/algorithms/runners/graph'
import type { MazeInput } from '~/lib/algorithms/runners/pathfinding'
import { pickMazeInput, runAStar } from '~/lib/algorithms/runners/pathfinding'
import { pickQueensN, runNQueens } from '~/lib/algorithms/runners/backtracking'
import { runBubble, runInsertion, runQuicksort, runMergesort } from '~/lib/algorithms/runners/sorting'
import { runBinarySearch } from '~/lib/algorithms/runners/searching'
import {
  runHeap, runBST, runLinkedList, pickTrieInput, runTrie, runHashTable, pickLRUInput, runLRU,
} from '~/lib/algorithms/runners/structures'
import { pickKnapsackInput, runKnapsack } from '~/lib/algorithms/runners/dp'

export type { StepState } from '~/lib/algorithms/types'
export type { Graph } from '~/lib/algorithms/graph'
export { ALGOS } from '~/lib/algorithms/catalogue'

export const useAlgoStore = defineStore('algorithms', () => {
  const algoId = ref('kahn')
  const graph = ref<Graph>(randomDAG())
  const array = ref<number[]>([])
  const arrayKind = ref<'shuffled' | 'sorted' | null>(null)
  const target = ref(0)
  /** Value lists for the data-structure entries, keyed by algo id. */
  const dsInputs = ref<Record<string, number[]>>({})
  /** Trie input: word list + the prefix to autocomplete. */
  const trieWords = ref<string[]>([])
  const triePrefix = ref('')
  const lruInput = ref<ReturnType<typeof pickLRUInput> | null>(null)
  const knapsackInput = ref<ReturnType<typeof pickKnapsackInput> | null>(null)
  /** Bellman-Ford runs on its own graph (needs a guaranteed negative edge). */
  const bfGraph = ref<Graph | null>(null)
  const mazeInput = ref<MazeInput | null>(null)
  const queensN = ref<number | null>(null)

  const trace = ref<AlgoStep[]>([])
  const { stepIndex, playing, speed, atEnd, restart, stepForward, stepBack, seek, togglePlay } =
    usePlaybackController(() => trace.value.length)

  const algo = computed(() => ALGOS.find(a => a.id === algoId.value) ?? ALGOS[0])
  const step = computed(() => trace.value[stepIndex.value])
  const state = computed<StepState>(() => step.value?.state ?? emptyState())

  const DS_SIZES: Record<string, number> = {
    heap: 7,
    bst: 9,
    'linked-list': 6,
    'hash-table': 9,
  }

  function ensureInput(fresh: boolean) {
    if (algo.value.id === 'bellman-ford') {
      if (fresh || !bfGraph.value) bfGraph.value = withOneNegativeEdge(randomDAG())
      return
    }
    if (algo.value.id === 'astar') {
      if (fresh || !mazeInput.value) mazeInput.value = pickMazeInput()
      return
    }
    if (algo.value.id === 'nqueens') {
      if (fresh || !queensN.value) queensN.value = pickQueensN()
      return
    }
    if (algo.value.viz === 'graph') {
      if (fresh) graph.value = randomDAG()
      return
    }
    if (algo.value.viz === 'array') {
      const wanted = algo.value.id === 'binary-search' ? 'sorted' : 'shuffled'
      if (!fresh && arrayKind.value === wanted) return
      if (wanted === 'sorted') {
        array.value = randomValues(SEARCH_SIZE).sort((a, b) => a - b)
        target.value = pickTarget(array.value)
      } else {
        array.value = randomValues(SORT_SIZE)
      }
      arrayKind.value = wanted
      return
    }
    // tree / list / hash: one input per entry
    const id = algo.value.id
    if (id === 'trie') {
      if (fresh || !trieWords.value.length) {
        const { words, prefix } = pickTrieInput()
        trieWords.value = words
        triePrefix.value = prefix
      }
      return
    }
    if (id === 'lru-cache') {
      if (fresh || !lruInput.value) lruInput.value = pickLRUInput()
      return
    }
    if (id === 'knapsack') {
      if (fresh || !knapsackInput.value) knapsackInput.value = pickKnapsackInput()
      return
    }
    if (fresh || !dsInputs.value[id]) {
      dsInputs.value[id] = randomValues(DS_SIZES[id] ?? 8)
      if (id === 'bst') target.value = pickTarget(dsInputs.value[id])
    }
  }

  function buildTrace() {
    switch (algo.value.id) {
      case 'kahn': trace.value = runKahn(graph.value); break
      case 'bfs': trace.value = runBFS(graph.value); break
      case 'dfs': trace.value = runDFS(graph.value); break
      case 'dijkstra': trace.value = runDijkstra(graph.value); break
      case 'kruskal': trace.value = runKruskal(graph.value); break
      case 'bellman-ford': trace.value = bfGraph.value ? runBellmanFord(bfGraph.value) : []; break
      case 'astar': trace.value = mazeInput.value ? runAStar(mazeInput.value) : []; break
      case 'nqueens': trace.value = queensN.value ? runNQueens(queensN.value) : []; break
      case 'bubble': trace.value = runBubble(array.value); break
      case 'insertion': trace.value = runInsertion(array.value); break
      case 'quicksort': trace.value = runQuicksort(array.value); break
      case 'mergesort': trace.value = runMergesort(array.value); break
      case 'binary-search': trace.value = runBinarySearch(array.value, target.value); break
      case 'heap': trace.value = runHeap(dsInputs.value.heap); break
      case 'bst': trace.value = runBST(dsInputs.value.bst, target.value); break
      case 'linked-list': trace.value = runLinkedList(dsInputs.value['linked-list']); break
      case 'trie': trace.value = runTrie(trieWords.value, triePrefix.value); break
      case 'lru-cache': trace.value = lruInput.value ? runLRU(lruInput.value) : []; break
      case 'knapsack': trace.value = knapsackInput.value ? runKnapsack(knapsackInput.value) : []; break
      case 'hash-table': trace.value = runHashTable(dsInputs.value['hash-table']); break
      default: trace.value = []
    }
    stepIndex.value = 0
    playing.value = false
  }

  function selectAlgo(id: string) {
    if (id === algoId.value) return
    algoId.value = id
    // Keep the same input when it still fits — comparing BFS vs DFS on the
    // same graph (or bubble vs insertion on the same array) is the lesson.
    ensureInput(false)
    buildTrace()
  }

  /** New random input for the current algorithm. */
  function regenerate() {
    ensureInput(true)
    buildTrace()
  }

  // Initial input + trace.
  ensureInput(false)
  buildTrace()

  return {
    algoId,
    graph,
    bfGraph,
    array,
    target,
    trieWords,
    triePrefix,
    trace,
    stepIndex,
    playing,
    speed,
    algo,
    step,
    state,
    atEnd,
    selectAlgo,
    regenerate,
    stepForward,
    stepBack,
    seek,
    togglePlay,
    restart,
  }
})

// Without this, editing this file in dev leaves components holding a NEW
// module (new ALGOS) while Pinia serves the OLD store instance — selecting
// a freshly added algorithm then hits buildTrace's default case and the
// visualization silently freezes.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAlgoStore, import.meta.hot))
}
