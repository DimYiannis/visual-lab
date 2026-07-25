/* ---------------------------------------------------------------------------
 * Algorithm Lab — shared types and constants used across every runner and
 * viz kind. `StepState` is a single loose shape shared by all
 * visualizations — each viz kind reads its own fields and ignores the rest
 * (same pattern as the Concurrency Lab's ConcurrencyStepState).
 * ------------------------------------------------------------------------ */

export const GRAPH_NODES = 8
export const SORT_SIZE = 10
export const SEARCH_SIZE = 13
export const MAX_GRAPH_EDGES = 13

export type VizKind = 'graph' | 'array' | 'tree' | 'list' | 'hash' | 'lru' | 'grid' | 'maze' | 'queens'

/** Hash-table bucket count (small prime so collisions happen on screen). */
export const HASH_BUCKETS = 7

export interface TreeNodeSnap {
  id: number
  value: number | string // numbers (heap/BST) or characters (trie)
  x: number
  y: number
}

/**
 * One snapshot of algorithm state. A single loose shape shared by all
 * visualizations — each viz kind reads its own fields and ignores the rest.
 * Every step owns fresh copies, so seeking is trivial.
 */
export interface StepState {
  // graph viz
  current: string | null
  activeEdge: string | null
  /** Edges consumed/removed (Kahn) — drawn faded. */
  cutEdges: string[]
  /** Edges the algorithm committed to (tree edges, best-path parents). */
  treeEdges: string[]
  /** Queue / stack / priority-queue contents, already formatted for chips. */
  frontier: string[]
  /** Output being built: topological order, visit order, settled set. */
  order: string[]
  seen: string[]
  /** Per-node annotation text (in-degree, distance). */
  badges: Record<string, string>
  // array viz
  array: number[]
  compare: number[]
  /** Indices in their (so-far) sorted position — violet until done. */
  locked: number[]
  /** Indices ruled out (binary search) — drawn ghosted. */
  discarded: number[]
  /** Named index markers rendered under the bars: { lo: 0, mid: 6 … }. */
  cursors: Record<string, number>
  foundIndex: number | null
  // tree viz (heap, BST) — node ids are heap indices / insertion counters
  treeNodes: TreeNodeSnap[]
  treeLinks: Array<[number, number]> // [parentId, childId]
  treeActive: number[] // amber: being compared
  treeVisited: number[] // path walked so far
  treeFocus: number | null // cyan: the node being placed/moved
  treeEnds: number[] // trie: nodes that complete a word (violet ring)
  // list viz (linked list) — index = fixed memory slot, next = arrows
  listValues: number[]
  listNext: Array<number | null>
  listActive: number | null // node whose arrow is being rewired
  // hash viz
  buckets: number[][]
  pendingKeys: number[]
  activeKey: number | null
  activeBucket: number | null
  // LRU cache viz — list is ordered most- to least-recently-used
  lruList: Array<{ key: number; value: number }>
  lruCap: number
  lruEvicted: number | null
  opsQueue: string[]
  opsLog: string[]
  // DP grid viz (knapsack) — gridValues sentinel -1 = not yet computed
  gridValues: number[][]
  gridRowLabels: string[]
  gridColLabels: string[]
  gridActive: [number, number] | null
  gridSource: Array<[number, number]>
  gridPath: Array<[number, number]>
  // maze viz (A*) — cells are flat indices: row * mazeW + col
  mazeW: number
  mazeH: number
  mazeWalls: number[]
  mazeStart: number
  mazeGoal: number
  mazeOpen: number[]
  mazeClosed: number[]
  mazeCurrent: number | null
  mazePath: number[]
  mazeScores: Record<number, string>
  // N-Queens viz (backtracking) — queensBoard[col] = row, or -1 if empty
  queensN: number
  queensBoard: number[]
  queensCol: number | null
  queensTryRow: number | null
  queensConflict: [number, number] | null // [row, col] of the queen causing a block
  // live operation counters — cumulative, meaning defined per-algorithm by
  // AlgoDef.opsLabel. This is what makes "bubble sort is O(n²)" a thing you
  // watch happen instead of a claim you take on faith.
  opsA: number
  opsB: number
  // shared
  done: boolean
}

export interface AlgoStep {
  /** 1-indexed line of the displayed Python source. */
  line: number
  /** One-line narration of what just happened. */
  note: string
  state: StepState
}

export interface AlgoDef {
  id: string
  label: string
  category: 'Graphs' | 'Sorting' | 'Searching' | 'Data structures' | 'Dynamic programming' | 'Backtracking'
  viz: VizKind
  complexity: string
  tagline: string
  lesson: string
  frontierLabel: string
  orderLabel: string
  badgeLabel: string
  showWeights: boolean
  code: string
  /**
   * Labels for the two live operation counters (state.opsA/opsB), e.g.
   * ['comparisons', 'swaps']. Empty string hides that counter — not every
   * algorithm has a natural second count.
   */
  opsLabel: [string, string]
}

export function emptyState(): StepState {
  return {
    current: null,
    activeEdge: null,
    cutEdges: [],
    treeEdges: [],
    frontier: [],
    order: [],
    seen: [],
    badges: {},
    array: [],
    compare: [],
    locked: [],
    discarded: [],
    cursors: {},
    foundIndex: null,
    treeNodes: [],
    treeLinks: [],
    treeActive: [],
    treeVisited: [],
    treeFocus: null,
    treeEnds: [],
    listValues: [],
    listNext: [],
    listActive: null,
    buckets: [],
    pendingKeys: [],
    activeKey: null,
    activeBucket: null,
    lruList: [],
    lruCap: 0,
    lruEvicted: null,
    opsQueue: [],
    opsLog: [],
    gridValues: [],
    gridRowLabels: [],
    gridColLabels: [],
    gridActive: null,
    gridSource: [],
    gridPath: [],
    mazeW: 0,
    mazeH: 0,
    mazeWalls: [],
    mazeStart: -1,
    mazeGoal: -1,
    mazeOpen: [],
    mazeClosed: [],
    mazeCurrent: null,
    mazePath: [],
    mazeScores: {},
    queensN: 0,
    queensBoard: [],
    queensCol: null,
    queensTryRow: null,
    queensConflict: null,
    opsA: 0,
    opsB: 0,
    done: false,
  }
}
