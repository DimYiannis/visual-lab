import { describe, it, expect } from 'vitest'
import { ALGOS } from '../../lib/algorithms/catalogue'
import type { AlgoStep } from '../../lib/algorithms/types'
import { randomDAG, withOneNegativeEdge } from '../../lib/algorithms/graph'
import { runKahn, runBFS, runDFS, runDijkstra, runKruskal, runBellmanFord } from '../../lib/algorithms/runners/graph'
import { pickMazeInput, runAStar } from '../../lib/algorithms/runners/pathfinding'
import { pickQueensN, runNQueens } from '../../lib/algorithms/runners/backtracking'
import { runBubble, runInsertion, runQuicksort, runMergesort } from '../../lib/algorithms/runners/sorting'
import { runBinarySearch } from '../../lib/algorithms/runners/searching'
import {
  runHeap, runBST, pickTrieInput, runTrie, runLinkedList, runHashTable, pickLRUInput, runLRU,
} from '../../lib/algorithms/runners/structures'
import { pickKnapsackInput, runKnapsack } from '../../lib/algorithms/runners/dp'

/**
 * Every algorithm, run once with representative input, keyed by id. This is
 * the automated version of the manual "does every push(line, …) point at a
 * real line" check that was done by hand (and with throwaway scripts) while
 * building each algorithm — now it survives refactors.
 */
function traceFor(id: string): AlgoStep[] {
  switch (id) {
    case 'kahn': return runKahn(randomDAG())
    case 'bfs': return runBFS(randomDAG())
    case 'dfs': return runDFS(randomDAG())
    case 'dijkstra': return runDijkstra(randomDAG())
    case 'kruskal': return runKruskal(randomDAG())
    case 'bellman-ford': return runBellmanFord(withOneNegativeEdge(randomDAG()))
    case 'astar': return runAStar(pickMazeInput())
    case 'nqueens': return runNQueens(pickQueensN())
    case 'bubble': return runBubble([5, 3, 8, 1, 9, 2])
    case 'insertion': return runInsertion([5, 3, 8, 1, 9, 2])
    case 'quicksort': return runQuicksort([5, 3, 8, 1, 9, 2])
    case 'mergesort': return runMergesort([5, 3, 8, 1, 9, 2])
    case 'binary-search': return runBinarySearch([1, 3, 5, 7, 9, 11], 7)
    case 'heap': return runHeap([9, 3, 7, 1, 8, 2, 5])
    case 'bst': return runBST([8, 3, 10, 1, 6, 14, 4], 6)
    case 'linked-list': return runLinkedList([1, 2, 3, 4, 5])
    case 'trie': { const { words, prefix } = pickTrieInput(); return runTrie(words, prefix) }
    case 'hash-table': return runHashTable([10, 17, 24, 3, 45, 22])
    case 'lru-cache': return runLRU(pickLRUInput())
    case 'knapsack': return runKnapsack(pickKnapsackInput())
    default: throw new Error(`No test wiring for algorithm id "${id}" — add a case in traceFor().`)
  }
}

describe('catalogue integrity', () => {
  it('has no duplicate ids', () => {
    const ids = ALGOS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every entry has non-empty code and a two-element opsLabel', () => {
    for (const algo of ALGOS) {
      expect(algo.code.length).toBeGreaterThan(0)
      expect(algo.opsLabel).toHaveLength(2)
    }
  })
})

describe.each(ALGOS.map(a => [a.id, a] as const))('%s — line references stay inside its Python source', (id, algo) => {
  const codeLineCount = algo.code.split('\n').length

  it('every step.line is a valid 1-indexed line in the displayed code', () => {
    const steps = traceFor(id)
    expect(steps.length).toBeGreaterThan(0)
    for (const step of steps) {
      expect(step.line).toBeGreaterThanOrEqual(1)
      expect(step.line).toBeLessThanOrEqual(codeLineCount)
    }
  })

  it('the trace ends with done: true', () => {
    const steps = traceFor(id)
    expect(steps[steps.length - 1].state.done).toBe(true)
  })

  it('every step has a non-empty narration', () => {
    const steps = traceFor(id)
    for (const step of steps) {
      expect(step.note.length).toBeGreaterThan(0)
    }
  })
})
