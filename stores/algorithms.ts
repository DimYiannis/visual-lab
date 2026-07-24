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
 * ------------------------------------------------------------------------ */

export const GRAPH_NODES = 8
export const SORT_SIZE = 10
export const SEARCH_SIZE = 13
export const MAX_GRAPH_EDGES = 13

export type VizKind = 'graph' | 'array' | 'tree' | 'list' | 'hash' | 'lru' | 'grid' | 'maze' | 'queens'

/** Hash-table bucket count (small prime so collisions happen on screen). */
export const HASH_BUCKETS = 7

export interface GraphNode {
  id: string
  x: number
  y: number
}

export interface GraphEdge {
  id: string // `${from}>${to}`
  from: string
  to: string
  w: number
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Outgoing edges per node, deterministic order (traversal order matters). */
  adj: Record<string, GraphEdge[]>
  /** Source node traversals start from (an in-degree-0 node). */
  start: string
}

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
    done: false,
  }
}

/* ---------------------------------------------------------------------------
 * Catalogue — the displayed Python is line-for-line what the runners trace.
 * Sources are arrays of lines so `index + 1` is the line number the runner
 * refers to; keep them in sync when editing either side.
 * ------------------------------------------------------------------------ */

export const ALGOS: AlgoDef[] = [
  {
    id: 'kahn',
    label: "Kahn's topological sort",
    category: 'Graphs',
    viz: 'graph',
    complexity: 'O(V + E)',
    tagline: 'Peel the free nodes',
    lesson:
      'A node is "free" when nothing points at it any more. Kahn\'s repeatedly removes a free node and cuts its outgoing edges — if the queue ever dries up early, the leftovers form a cycle.',
    frontierLabel: 'queue',
    orderLabel: 'order',
    badgeLabel: 'in-degree',
    showWeights: false,
    code: [
      'from collections import deque',
      '',
      'def kahn(nodes, edges, adj):',
      '    # 1) count arrows into each node',
      '    indeg = {n: 0 for n in nodes}',
      '    for u, v in edges:',
      '        indeg[v] += 1',
      '',
      '    # 2) free nodes seed the queue',
      '    queue = deque(',
      '        n for n in nodes if indeg[n] == 0',
      '    )',
      '    order = []',
      '',
      '    # 3) peel the graph, layer by layer',
      '    while queue:',
      '        u = queue.popleft()',
      '        order.append(u)',
      '        for v in adj[u]:',
      '            indeg[v] -= 1',
      '            if indeg[v] == 0:',
      '                queue.append(v)',
      '',
      '    # leftovers ⇒ the graph had a cycle',
      '    if len(order) < len(nodes):',
      '        raise ValueError("cycle detected")',
      '    return order',
    ].join('\n'),
  },
  {
    id: 'bfs',
    label: 'Breadth-first search',
    category: 'Graphs',
    viz: 'graph',
    complexity: 'O(V + E)',
    tagline: 'Explore in rings',
    lesson:
      'A queue makes exploration fair: everything at distance 1 is visited before anything at distance 2. That is why the first time BFS reaches a node, it arrived via a fewest-edges path.',
    frontierLabel: 'queue',
    orderLabel: 'visit order',
    badgeLabel: '',
    showWeights: false,
    code: [
      'from collections import deque',
      '',
      'def bfs(start, adj):',
      '    seen = {start}',
      '    queue = deque([start])',
      '    order = []',
      '',
      '    while queue:',
      '        u = queue.popleft()',
      '        order.append(u)',
      '        for v in adj[u]:',
      '            if v not in seen:',
      '                seen.add(v)',
      '                queue.append(v)',
      '',
      '    return order',
    ].join('\n'),
  },
  {
    id: 'dfs',
    label: 'Depth-first search',
    category: 'Graphs',
    viz: 'graph',
    complexity: 'O(V + E)',
    tagline: 'Follow one thread to its end',
    lesson:
      'Recursion is a stack: DFS dives down one path until it dead-ends, then backtracks to the last fork. Swap BFS\'s queue for a stack and the exploration order flips from rings to threads.',
    frontierLabel: 'call stack',
    orderLabel: 'visit order',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def dfs(start, adj):',
      '    seen = {start}',
      '    order = []',
      '',
      '    def visit(u):',
      '        order.append(u)',
      '        for v in adj[u]:',
      '            if v not in seen:',
      '                seen.add(v)',
      '                visit(v)  # dive deeper',
      '',
      '    visit(start)',
      '    return order',
    ].join('\n'),
  },
  {
    id: 'dijkstra',
    label: "Dijkstra's shortest paths",
    category: 'Graphs',
    viz: 'graph',
    complexity: 'O((V + E) log V)',
    tagline: 'Settle the closest first',
    lesson:
      'Greedy, but safe: always settle the closest unsettled node. With no negative edges, nothing popped later can ever undercut it — so each pop is final. The violet edges are the best-known route home.',
    frontierLabel: 'priority queue',
    orderLabel: 'settled',
    badgeLabel: 'distance',
    showWeights: true,
    code: [
      'import heapq',
      '',
      'def dijkstra(start, nodes, adj):',
      '    dist = {n: float("inf") for n in nodes}',
      '    dist[start] = 0',
      '    pq = [(0, start)]',
      '',
      '    while pq:',
      '        d, u = heapq.heappop(pq)',
      '        if d > dist[u]:',
      '            continue  # stale entry',
      '        for v, w in adj[u]:',
      '            if d + w < dist[v]:',
      '                dist[v] = d + w',
      '                heapq.heappush(pq, (d + w, v))',
      '',
      '    return dist',
    ].join('\n'),
  },
  {
    id: 'kruskal',
    label: "Kruskal's MST · Union-Find",
    category: 'Graphs',
    viz: 'graph',
    complexity: 'O(E log E)',
    tagline: 'Cheapest edge that connects two islands',
    lesson:
      'Sort edges cheapest first; take one only if its ends are on different islands (Union-Find answers that in nearly O(1)) — same island means a cycle, so skip it. This greedy rule finds the minimum-cost network that connects everyone: the algorithm behind cable/pipeline layout, clustering, and image segmentation.',
    frontierLabel: 'edges left',
    orderLabel: 'MST edges',
    badgeLabel: 'root',
    showWeights: true,
    code: [
      'class UnionFind:',
      '    def __init__(self, nodes):',
      '        self.parent = {n: n for n in nodes}',
      '',
      '    def find(self, x):',
      '        while self.parent[x] != x:',
      '            # path halving: point at grandparent',
      '            self.parent[x] = self.parent[self.parent[x]]',
      '            x = self.parent[x]',
      '        return x',
      '',
      '    def union(self, a, b):',
      '        ra, rb = self.find(a), self.find(b)',
      '        if ra == rb:',
      '            return False  # same island: a cycle',
      '        self.parent[ra] = rb',
      '        return True',
      '',
      'def kruskal(nodes, edges):',
      '    dsu = UnionFind(nodes)',
      '    mst = []',
      '    for u, v, w in sorted(edges, key=lambda e: e[2]):',
      '        if dsu.union(u, v):',
      '            mst.append((u, v, w))',
      '    return mst',
    ].join('\n'),
  },
  {
    id: 'bellman-ford',
    label: 'Bellman-Ford',
    category: 'Graphs',
    viz: 'graph',
    complexity: 'O(V × E)',
    tagline: 'Slower, but handles negative edges',
    lesson:
      "Dijkstra assumes every edge only makes things worse (never negative) — a discount or a refund breaks that assumption. Bellman-Ford drops the priority queue and just relaxes every edge, V−1 times over — brute-force honest, and it can even prove a negative cycle exists by trying one round more. This is why routing protocols like RIP use it: correctness under any weight, not raw speed.",
    frontierLabel: 'edges this round',
    orderLabel: 'rounds',
    badgeLabel: 'distance',
    showWeights: true,
    code: [
      'def bellman_ford(start, nodes, edges):',
      '    dist = {n: float("inf") for n in nodes}',
      '    dist[start] = 0',
      '',
      '    for i in range(len(nodes) - 1):',
      '        updated = False',
      '        for u, v, w in edges:',
      '            if dist[u] + w < dist[v]:',
      '                dist[v] = dist[u] + w',
      '                updated = True',
      '        if not updated:',
      '            break  # converged early',
      '',
      '    for u, v, w in edges:',
      '        if dist[u] + w < dist[v]:',
      '            raise ValueError("negative cycle")',
      '',
      '    return dist',
    ].join('\n'),
  },
  {
    id: 'astar',
    label: 'A* pathfinding',
    category: 'Graphs',
    viz: 'maze',
    complexity: 'O(E log V) typical',
    tagline: 'Dijkstra with a hunch',
    lesson:
      "Dijkstra expands uniformly in every direction because it knows nothing about where the goal is. A* adds a heuristic — here, straight-line-ish distance to the goal — so cells pointing toward the exit get explored first. Same guarantee of the shortest path (as long as the heuristic never overestimates), far less wasted exploration. This is the algorithm behind game pathfinding and GPS routing.",
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'import heapq',
      '',
      'def astar(start, goal, neighbors):',
      '    g = {start: 0}',
      '    open_set = [(heuristic(start, goal), start)]',
      '    came_from = {}',
      '',
      '    while open_set:',
      '        _, cur = heapq.heappop(open_set)',
      '        if cur == goal:',
      '            return reconstruct(came_from, cur)',
      '',
      '        for nxt in neighbors(cur):',
      '            tentative = g[cur] + 1',
      '            if tentative < g.get(nxt, float("inf")):',
      '                came_from[nxt] = cur',
      '                g[nxt] = tentative',
      '                f = tentative + heuristic(nxt, goal)',
      '                heapq.heappush(open_set, (f, nxt))',
      '',
      '    return None  # unreachable',
    ].join('\n'),
  },
  {
    id: 'nqueens',
    label: 'N-Queens (backtracking)',
    category: 'Backtracking',
    viz: 'queens',
    complexity: 'O(N!) worst case',
    tagline: 'Try, fail, undo',
    lesson:
      'Backtracking is depth-first search over decisions instead of nodes: place a queen, keep going as long as nothing conflicts, and the instant something does, undo the last choice and try the next option. No cleverness beyond systematic trial and error — checking safety before descending (not after) is what keeps it from ever exploring the full N! placements. The same shape solves Sudoku, maze generation, and constraint scheduling generally.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def solve(board, col, n):',
      '    if col == n:',
      '        return True  # queen placed in every column',
      '',
      '    for row in range(n):',
      '        if is_safe(board, row, col, n):',
      '            board[col] = row       # place queen',
      '            if solve(board, col + 1, n):',
      '                return True',
      '            board[col] = -1        # backtrack',
      '',
      '    return False  # no row works in this column',
      '',
      'def is_safe(board, row, col, n):',
      '    for c in range(col):',
      '        r = board[c]',
      '        if r == row or abs(r - row) == abs(c - col):',
      '            return False',
      '    return True',
    ].join('\n'),
  },
  {
    id: 'bubble',
    label: 'Bubble sort',
    category: 'Sorting',
    viz: 'array',
    complexity: 'O(n²)',
    tagline: 'Neighbours swap until calm',
    lesson:
      'Each pass carries the biggest remaining value to the end like a bubble rising. Count the comparisons: quadratic hurts even at n = 10 — that is the whole argument for n log n sorts.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def bubble_sort(a):',
      '    n = len(a)',
      '    for i in range(n - 1):',
      '        swapped = False',
      '        for j in range(n - 1 - i):',
      '            if a[j] > a[j + 1]:',
      '                a[j], a[j + 1] = a[j + 1], a[j]',
      '                swapped = True',
      '        if not swapped:',
      '            break  # already sorted',
      '    return a',
    ].join('\n'),
  },
  {
    id: 'insertion',
    label: 'Insertion sort',
    category: 'Sorting',
    viz: 'array',
    complexity: 'O(n²)',
    tagline: 'Sort like holding cards',
    lesson:
      'Grow a sorted prefix: pull the next value out, shift bigger ones right, drop it in its slot. On nearly-sorted input almost nothing shifts — insertion sort is secretly linear there.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def insertion_sort(a):',
      '    for i in range(1, len(a)):',
      '        key = a[i]',
      '        j = i - 1',
      '        # shift bigger values right',
      '        while j >= 0 and a[j] > key:',
      '            a[j + 1] = a[j]',
      '            j -= 1',
      '        a[j + 1] = key',
      '    return a',
    ].join('\n'),
  },
  {
    id: 'quicksort',
    label: 'Quicksort',
    category: 'Sorting',
    viz: 'array',
    complexity: 'O(n log n) avg',
    tagline: 'Partition around a pivot',
    lesson:
      'Sweep everything smaller than the pivot to the left, then drop the pivot between the two camps — that slot is final forever (violet). Recursion sorts each side. Sorted input is the worst case (n²), which is why real libraries pick pivots at random.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def quicksort(a, lo=0, hi=None):',
      '    if hi is None:',
      '        hi = len(a) - 1',
      '    if lo >= hi:',
      '        return a',
      '',
      '    pivot = a[hi]  # rightmost value',
      '    i = lo         # small-zone boundary',
      '    for j in range(lo, hi):',
      '        if a[j] < pivot:',
      '            a[i], a[j] = a[j], a[i]',
      '            i += 1',
      '    a[i], a[hi] = a[hi], a[i]  # pivot home',
      '',
      '    quicksort(a, lo, i - 1)',
      '    quicksort(a, i + 1, hi)',
      '    return a',
    ].join('\n'),
  },
  {
    id: 'mergesort',
    label: 'Merge sort',
    category: 'Sorting',
    viz: 'array',
    complexity: 'O(n log n)',
    tagline: 'Split, sort, zip together',
    lesson:
      'Halve until single elements, then merge back up: always take the smaller front of the two sorted halves. Guaranteed n log n — no bad inputs — at the price of scratch space for the halves.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def merge_sort(a, lo=0, hi=None):',
      '    if hi is None:',
      '        hi = len(a) - 1',
      '    if lo >= hi:',
      '        return a',
      '',
      '    mid = (lo + hi) // 2',
      '    merge_sort(a, lo, mid)',
      '    merge_sort(a, mid + 1, hi)',
      '',
      '    # merge the two sorted halves',
      '    left = a[lo:mid + 1]',
      '    right = a[mid + 1:hi + 1]',
      '    i = j = 0',
      '    k = lo',
      '    while i < len(left) and j < len(right):',
      '        if left[i] <= right[j]:',
      '            a[k] = left[i]; i += 1',
      '        else:',
      '            a[k] = right[j]; j += 1',
      '        k += 1',
      '    a[k:hi + 1] = left[i:] or right[j:]',
      '    return a',
    ].join('\n'),
  },
  {
    id: 'binary-search',
    label: 'Binary search',
    category: 'Searching',
    viz: 'array',
    complexity: 'O(log n)',
    tagline: 'Halve the haystack',
    lesson:
      'Sorted data lets one comparison discard half of what remains. 13 values need at most 4 probes; a billion need 30. Sortedness is what you are really paying for.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def binary_search(a, target):',
      '    lo, hi = 0, len(a) - 1',
      '',
      '    while lo <= hi:',
      '        mid = (lo + hi) // 2',
      '        if a[mid] == target:',
      '            return mid',
      '        if a[mid] < target:',
      '            lo = mid + 1',
      '        else:',
      '            hi = mid - 1',
      '',
      '    return -1',
    ].join('\n'),
  },
  {
    id: 'heap',
    label: 'Binary min-heap',
    category: 'Data structures',
    viz: 'tree',
    complexity: 'O(log n) push/pop',
    tagline: 'The almost-sorted tree',
    lesson:
      'A heap promises one thing only: parent ≤ children. That keeps the minimum on top and makes repairs cheap — one root-to-leaf path, log n. And the tree is secretly just the array below it: node i\'s children live at 2i+1 and 2i+2.',
    frontierLabel: '',
    orderLabel: 'extracted',
    badgeLabel: '',
    showWeights: false,
    code: [
      'class MinHeap:',
      '    def __init__(self):',
      '        self.a = []',
      '',
      '    def push(self, x):',
      '        self.a.append(x)',
      '        i = len(self.a) - 1',
      '        while i > 0:',
      '            p = (i - 1) // 2',
      '            if self.a[p] <= self.a[i]:',
      '                break',
      '            self.a[p], self.a[i] = \\',
      '                self.a[i], self.a[p]',
      '            i = p',
      '',
      '    def pop(self):',
      '        a = self.a',
      '        a[0], a[-1] = a[-1], a[0]',
      '        m = a.pop()',
      '        i = 0',
      '        while True:',
      '            l, r = 2*i + 1, 2*i + 2',
      '            s = i',
      '            if l < len(a) and a[l] < a[s]: s = l',
      '            if r < len(a) and a[r] < a[s]: s = r',
      '            if s == i:',
      '                break',
      '            a[i], a[s] = a[s], a[i]',
      '            i = s',
      '        return m',
    ].join('\n'),
  },
  {
    id: 'bst',
    label: 'Binary search tree',
    category: 'Data structures',
    viz: 'tree',
    complexity: 'O(log n) avg',
    tagline: 'Binary search, grown as a tree',
    lesson:
      'Left < node < right at every fork: the insertion ORDER becomes a SHAPE. Search just re-walks the same decisions. Feed it sorted input and it degenerates into a linked list — that is exactly why balanced trees (AVL, red-black) exist.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def insert(root, v):',
      '    if root is None:',
      '        return Node(v)  # new leaf',
      '    if v < root.v:',
      '        root.left = insert(root.left, v)',
      '    else:',
      '        root.right = insert(root.right, v)',
      '    return root',
      '',
      'def search(root, t):',
      '    while root:',
      '        if t == root.v:',
      '            return True',
      '        root = (root.left if t < root.v',
      '                else root.right)',
      '    return False',
    ].join('\n'),
  },
  {
    id: 'linked-list',
    label: 'Linked list · reverse',
    category: 'Data structures',
    viz: 'list',
    complexity: 'O(n), O(1) space',
    tagline: 'Three pointers, flipped arrows',
    lesson:
      'Nodes never move — only the arrows flip. The whole trick is saving next BEFORE cutting curr.next, or the rest of the list floats away unreachable. Pointer discipline like this is the foundation of every linked structure you will ever debug.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'class Node:',
      '    def __init__(self, v, nxt=None):',
      '        self.v = v',
      '        self.next = nxt',
      '',
      'def reverse(head):',
      '    prev = None',
      '    curr = head',
      '    while curr:',
      '        nxt = curr.next   # save the rest',
      '        curr.next = prev  # flip the arrow',
      '        prev = curr       # advance',
      '        curr = nxt',
      '    return prev           # new head',
    ].join('\n'),
  },
  {
    id: 'trie',
    label: 'Trie (prefix tree)',
    category: 'Data structures',
    viz: 'tree',
    complexity: 'O(word length)',
    tagline: 'Words as paths',
    lesson:
      'One node per character: a word is a root-to-leaf path, and words sharing a prefix share a branch. Lookup cost depends on word length, not dictionary size — this is how autocomplete, spell-check and routing tables scale.',
    frontierLabel: '',
    orderLabel: 'completions',
    badgeLabel: '',
    showWeights: false,
    code: [
      'class TrieNode:',
      '    def __init__(self):',
      '        self.kids = {}',
      '        self.is_word = False',
      '',
      'def insert(root, word):',
      '    node = root',
      '    for ch in word:',
      '        if ch not in node.kids:',
      '            node.kids[ch] = TrieNode()',
      '        node = node.kids[ch]',
      '    node.is_word = True',
      '',
      'def complete(root, prefix):',
      '    node = root',
      '    for ch in prefix:',
      '        if ch not in node.kids:',
      '            return []  # dead end',
      '        node = node.kids[ch]',
      '    # walk the subtree, gather words',
      '    return collect(node, prefix)',
    ].join('\n'),
  },
  {
    id: 'hash-table',
    label: 'Hash table · chaining',
    category: 'Data structures',
    viz: 'hash',
    complexity: 'O(1) average',
    tagline: 'Any key, one jump',
    lesson:
      'key % 7 turns any key into a bucket index — lookup never scans the table, it jumps. Two keys landing in one bucket is a collision; the chain absorbs it. Keep the load factor low and chains stay short enough to call it O(1).',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'class HashTable:',
      '    def __init__(self, size=7):',
      '        self.buckets = [',
      '            [] for _ in range(size)',
      '        ]',
      '',
      '    def insert(self, key):',
      '        h = key % len(self.buckets)',
      '        chain = self.buckets[h]',
      '        if key in chain:',
      '            return  # already stored',
      '        chain.append(key)',
    ].join('\n'),
  },
  {
    id: 'lru-cache',
    label: 'LRU cache',
    category: 'Data structures',
    viz: 'lru',
    complexity: 'O(1) per op',
    tagline: 'A hash map that remembers order',
    lesson:
      'Neither structure alone is enough: a hash map gives O(1) lookup but no sense of order, a linked list gives order but O(n) lookup. Bolt them together — the map stores node references, the list tracks recency — and both operations stay O(1). This exact composition runs eviction in browsers, CDNs, and database buffer pools.',
    frontierLabel: '',
    orderLabel: '',
    badgeLabel: '',
    showWeights: false,
    code: [
      'class Node:',
      '    def __init__(self, k, v):',
      '        self.k, self.v = k, v',
      '        self.prev = self.next = None',
      '',
      'class LRUCache:',
      '    def __init__(self, cap):',
      '        self.cap = cap',
      '        self.map = {}',
      '        self.head = Node(0, 0)   # MRU sentinel',
      '        self.tail = Node(0, 0)   # LRU sentinel',
      '        self.head.next = self.tail',
      '        self.tail.prev = self.head',
      '',
      '    def _unlink(self, n):',
      '        n.prev.next, n.next.prev = n.next, n.prev',
      '',
      '    def _push_front(self, n):',
      '        n.next = self.head.next',
      '        n.prev = self.head',
      '        self.head.next.prev = n',
      '        self.head.next = n',
      '',
      '    def get(self, k):',
      '        if k not in self.map:',
      '            return -1',
      '        n = self.map[k]',
      '        self._unlink(n)',
      '        self._push_front(n)   # just used: most recent',
      '        return n.v',
      '',
      '    def put(self, k, v):',
      '        if k in self.map:',
      '            self._unlink(self.map[k])',
      '        n = Node(k, v)',
      '        self.map[k] = n',
      '        self._push_front(n)',
      '        if len(self.map) > self.cap:',
      '            lru = self.tail.prev          # least recently used',
      '            self._unlink(lru)',
      '            del self.map[lru.k]',
    ].join('\n'),
  },
  {
    id: 'knapsack',
    label: '0/1 Knapsack (DP)',
    category: 'Dynamic programming',
    viz: 'grid',
    complexity: 'O(n × capacity)',
    tagline: 'Every subproblem, solved once',
    lesson:
      'Each cell answers one narrow question — best value using the first i items within capacity c — and every cell after it reuses these answers instead of recomputing them from scratch. That reuse is the entire idea: exponential brute force (try every subset) collapses into one pass over a grid. The same pattern prices trading decisions, aligns DNA sequences, and diffs files.',
    frontierLabel: '',
    orderLabel: 'chosen items',
    badgeLabel: '',
    showWeights: false,
    code: [
      'def knapsack(weights, values, cap):',
      '    n = len(weights)',
      '    dp = [[0] * (cap + 1) for _ in range(n + 1)]',
      '',
      '    for i in range(1, n + 1):',
      '        w, v = weights[i - 1], values[i - 1]',
      '        for c in range(cap + 1):',
      '            dp[i][c] = dp[i - 1][c]          # skip item i',
      '            if w <= c:',
      '                take = v + dp[i - 1][c - w]  # take item i',
      '                dp[i][c] = max(dp[i][c], take)',
      '',
      '    return dp[n][cap]',
    ].join('\n'),
  },
]

/* ---------------------------------------------------------------------------
 * Input generation
 * ------------------------------------------------------------------------ */

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const VIEW_W = 640
const VIEW_H = 400

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Random connected-ish DAG with a layered layout: column = longest path from
 * a source, so every edge points rightward and the topological order reads
 * left to right. Weights are random 1–9 (only Dijkstra shows them).
 */
export function randomDAG(): Graph {
  const topo = shuffle(LABELS.slice(0, GRAPH_NODES))
  const rank = new Map(topo.map((id, i) => [id, i]))
  const edgeIds = new Set<string>()
  const edges: GraphEdge[] = []

  const addEdge = (u: string, v: string) => {
    const id = `${u}>${v}`
    if (edgeIds.has(id)) return
    edgeIds.add(id)
    edges.push({ id, from: u, to: v, w: 1 + Math.floor(Math.random() * 9) })
  }

  for (let i = 0; i < topo.length; i++) {
    for (let j = i + 1; j < topo.length; j++) {
      const gap = j - i
      const p = gap === 1 ? 0.42 : gap === 2 ? 0.22 : 0.06
      if (Math.random() < p) addEdge(topo[i], topo[j])
    }
  }

  // No orphan nodes: give untouched ones an incoming (or outgoing) edge.
  for (const id of topo) {
    if (edges.some(e => e.from === id || e.to === id)) continue
    const i = rank.get(id)!
    if (i === 0) addEdge(id, topo[1])
    else addEdge(topo[Math.floor(Math.random() * i)], id)
  }

  // Thin out dense graphs without orphaning anyone.
  let guard = 200
  while (edges.length > MAX_GRAPH_EDGES && guard-- > 0) {
    const k = Math.floor(Math.random() * edges.length)
    const e = edges[k]
    const deg = (id: string) => edges.filter(x => x.from === id || x.to === id).length
    if (deg(e.from) > 1 && deg(e.to) > 1) {
      edges.splice(k, 1)
      edgeIds.delete(e.id)
    }
  }

  // Longest-path depth (topo order makes one pass enough).
  const depth: Record<string, number> = Object.fromEntries(topo.map(id => [id, 0]))
  for (const id of topo) {
    for (const e of edges) {
      if (e.from === id) depth[e.to] = Math.max(depth[e.to], depth[id] + 1)
    }
  }
  const maxDepth = Math.max(...Object.values(depth))
  const cols: Record<number, string[]> = {}
  for (const id of topo) (cols[depth[id]] ??= []).push(id)

  const nodes: GraphNode[] = topo.map(id => {
    const d = depth[id]
    const col = cols[d]
    const row = col.indexOf(id)
    const x = maxDepth === 0 ? VIEW_W / 2 : 56 + d * ((VIEW_W - 112) / maxDepth)
    const y = 42 + (row + 0.5) * ((VIEW_H - 84) / col.length)
    return { id, x, y }
  })

  const adj: Record<string, GraphEdge[]> = Object.fromEntries(topo.map(id => [id, [] as GraphEdge[]]))
  for (const e of edges) adj[e.from].push(e)
  for (const id of topo) adj[id].sort((a, b) => a.to.localeCompare(b.to))

  // Traversals start from the busiest source.
  const sources = topo.filter(id => !edges.some(e => e.to === id))
  const start = [...sources].sort((a, b) => adj[b].length - adj[a].length)[0] ?? topo[0]

  return { nodes, edges, adj, start }
}

function randomValues(n: number): number[] {
  const vals = new Set<number>()
  while (vals.size < n) vals.add(8 + Math.floor(Math.random() * 91))
  return shuffle([...vals])
}

function pickTarget(sorted: number[]): number {
  // Mostly present (find it), sometimes absent (watch the -1 path).
  if (Math.random() < 0.75) return sorted[Math.floor(Math.random() * sorted.length)]
  let t = 8 + Math.floor(Math.random() * 91)
  while (sorted.includes(t)) t++
  return t
}

/* ---------------------------------------------------------------------------
 * Runners — TypeScript twins of the displayed Python. Line numbers in the
 * push() calls refer to the code arrays above.
 * ------------------------------------------------------------------------ */

function runKahn(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const indeg: Record<string, number> = Object.fromEntries(g.nodes.map(n => [n.id, 0]))
  const queue: string[] = []
  const order: string[] = []
  const cut: string[] = []
  let current: string | null = null
  let active: string | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        current,
        activeEdge: active,
        cutEdges: [...cut],
        frontier: [...queue],
        order: [...order],
        badges: Object.fromEntries(g.nodes.map(n => [n.id, String(indeg[n.id])])),
        done,
      },
    })
  }

  push(5, 'Every node starts at in-degree 0.')
  for (const e of g.edges) {
    active = e.id
    indeg[e.to] += 1
    push(7, `${e.from}→${e.to} raises indeg[${e.to}] to ${indeg[e.to]}.`)
  }
  active = null

  for (const n of g.nodes) if (indeg[n.id] === 0) queue.push(n.id)
  push(11, `Nothing points at ${queue.join(', ')} — they seed the queue.`)
  push(13, 'The order starts empty.')

  while (queue.length) {
    current = queue.shift()!
    push(17, `Pop ${current}: its last incoming edge is long gone.`)
    order.push(current)
    push(18, `${current} is safe to schedule next.`)
    for (const e of g.adj[current]) {
      active = e.id
      indeg[e.to] -= 1
      cut.push(e.id)
      push(20, `Cut ${e.from}→${e.to}: indeg[${e.to}] drops to ${indeg[e.to]}.`)
      if (indeg[e.to] === 0) {
        queue.push(e.to)
        push(22, `${e.to} is free now — enqueue it.`)
      }
      active = null
    }
    current = null
  }

  push(16, 'Queue empty — every node has been peeled off.')
  push(27, `Topological order: ${order.join(' → ')}. No cycle here.`, true)
  return steps
}

function runBFS(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const seen = new Set<string>([g.start])
  const queue: string[] = [g.start]
  const order: string[] = []
  const tree: string[] = []
  let current: string | null = null
  let active: string | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        current,
        activeEdge: active,
        treeEdges: [...tree],
        frontier: [...queue],
        order: [...order],
        seen: [...seen],
        done,
      },
    })
  }

  push(4, `Start at ${g.start}: mark it seen so it is never re-queued.`)
  push(5, `${g.start} is the whole frontier for now.`)
  push(6, 'Visit order starts empty.')

  while (queue.length) {
    current = queue.shift()!
    push(9, `Pop ${current} — the oldest node in the queue.`)
    order.push(current)
    push(10, `Visit ${current}.`)
    for (const e of g.adj[current]) {
      active = e.id
      if (!seen.has(e.to)) {
        seen.add(e.to)
        queue.push(e.to)
        tree.push(e.id)
        push(14, `${e.to} is new: mark it seen and enqueue it.`)
      } else {
        push(12, `${e.to} was already seen — skip it.`)
      }
      active = null
    }
    current = null
  }

  const missed = g.nodes.map(n => n.id).filter(id => !seen.has(id))
  push(8, 'Queue empty — the frontier has nowhere left to grow.')
  push(
    16,
    missed.length
      ? `Visited ${order.join(' → ')}. ${missed.join(', ')} unreachable from ${g.start}.`
      : `Visit order: ${order.join(' → ')} — rings of increasing distance.`,
    true,
  )
  return steps
}

function runDFS(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const seen = new Set<string>([g.start])
  const order: string[] = []
  const stack: string[] = []
  const tree: string[] = []
  let active: string | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        current: stack[stack.length - 1] ?? null,
        activeEdge: active,
        treeEdges: [...tree],
        frontier: [...stack],
        order: [...order],
        seen: [...seen],
        done,
      },
    })
  }

  push(2, `Start at ${g.start}: mark it seen.`)
  push(3, 'Visit order starts empty.')

  const visit = (u: string) => {
    stack.push(u)
    order.push(u)
    push(6, `Visit ${u}${stack.length > 1 ? ` (depth ${stack.length})` : ''}.`)
    for (const e of g.adj[u]) {
      active = e.id
      if (!seen.has(e.to)) {
        seen.add(e.to)
        tree.push(e.id)
        push(9, `${e.to} is new — mark it seen.`)
        active = null
        push(10, `Dive into ${e.to} before touching ${u}'s other neighbours.`)
        visit(e.to)
      } else {
        push(8, `${e.to} already seen — skip it.`)
        active = null
      }
    }
    stack.pop()
    if (stack.length) {
      push(7, `${u} is exhausted — backtrack to ${stack[stack.length - 1]}.`)
    }
  }

  push(12, `Call visit(${g.start}).`)
  visit(g.start)

  const missed = g.nodes.map(n => n.id).filter(id => !seen.has(id))
  push(
    13,
    missed.length
      ? `Visited ${order.join(' → ')}. ${missed.join(', ')} unreachable from ${g.start}.`
      : `Visit order: ${order.join(' → ')} — one thread at a time.`,
    true,
  )
  return steps
}

function runDijkstra(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const INF = Number.POSITIVE_INFINITY
  const dist: Record<string, number> = Object.fromEntries(g.nodes.map(n => [n.id, INF]))
  const parent: Record<string, string> = {}
  const pq: Array<[number, string]> = []
  const settled: string[] = []
  let current: string | null = null
  let active: string | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        current,
        activeEdge: active,
        treeEdges: Object.values(parent),
        frontier: [...pq].sort((a, b) => a[0] - b[0]).map(([d, u]) => `${u}·${d}`),
        order: [...settled],
        badges: Object.fromEntries(
          g.nodes.map(n => [n.id, dist[n.id] === INF ? '∞' : String(dist[n.id])]),
        ),
        done,
      },
    })
  }

  push(4, 'Every node starts infinitely far away.')
  dist[g.start] = 0
  push(5, `dist[${g.start}] = 0 — we are already there.`)
  pq.push([0, g.start])
  push(6, `Seed the priority queue with (0, ${g.start}).`)

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]))
    const [d, u] = pq.shift()!
    current = u
    push(9, `Pop ${u} at distance ${d} — the closest unsettled node.`)
    if (d > dist[u]) {
      push(11, `Stale entry: ${u} already has a shorter path (${dist[u]}). Skip.`)
      current = null
      continue
    }
    settled.push(u)
    for (const e of g.adj[u]) {
      active = e.id
      const nd = d + e.w
      if (nd < dist[e.to]) {
        const old = dist[e.to]
        dist[e.to] = nd
        parent[e.to] = e.id
        push(14, `Relax ${u}→${e.to}: ${d} + ${e.w} = ${nd} beats ${old === INF ? '∞' : old}.`)
        pq.push([nd, e.to])
        push(15, `Push (${nd}, ${e.to}) — maybe the frontier's new closest.`)
      } else {
        push(13, `${d} + ${e.w} = ${nd} is no better than dist[${e.to}] = ${dist[e.to]}.`)
      }
      active = null
    }
    current = null
  }

  const reached = g.nodes.filter(n => dist[n.id] < INF).length
  push(
    17,
    `Done: shortest distances from ${g.start} to ${reached} of ${g.nodes.length} nodes. Violet edges are the shortest-path tree.`,
    true,
  )
  return steps
}

function runKruskal(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const parent: Record<string, string> = Object.fromEntries(g.nodes.map(n => [n.id, n.id]))
  const mstEdges: string[] = []
  const remaining = [...g.edges].sort((a, b) => a.w - b.w || a.id.localeCompare(b.id))
  const tree: string[] = []
  const cut: string[] = []
  let active: string | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        activeEdge: active,
        treeEdges: [...tree],
        cutEdges: [...cut],
        frontier: remaining.map(e => `${e.from}-${e.to}·${e.w}`),
        order: [...mstEdges],
        badges: Object.fromEntries(g.nodes.map(n => [n.id, parent[n.id]])),
        done,
      },
    })
  }

  const find = (x: string): string => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]] // path halving
      x = parent[x]
    }
    return x
  }

  push(3, 'Every node starts as its own island — its own root.')
  push(20, `${g.edges.length} edges, sorted cheapest first: that greedy order is the whole algorithm.`)

  while (remaining.length) {
    const e = remaining.shift()!
    active = e.id
    push(22, `Cheapest edge left: ${e.from}–${e.to} (weight ${e.w}).`)
    const ra = find(e.from)
    const rb = find(e.to)
    push(13, `find(${e.from}) = ${ra}, find(${e.to}) = ${rb} — path-halved along the way.`)
    if (ra === rb) {
      cut.push(e.id)
      push(15, `Same island already — adding this edge would close a cycle. Skip.`)
    } else {
      parent[ra] = rb
      tree.push(e.id)
      mstEdges.push(`${e.from}-${e.to}`)
      push(16, `Different islands: union them. ${ra}'s island now points at ${rb}.`)
      push(23, `${e.from}–${e.to} joins the MST — cheapest connector for these two islands.`)
    }
    active = null
  }

  push(
    25,
    `Done: ${mstEdges.length} edges connect all ${g.nodes.length} nodes at minimum total weight. ${cut.length} edge${cut.length === 1 ? '' : 's'} skipped as cycles.`,
    true,
  )
  return steps
}

/** Bellman-Ford needs at least one negative edge to be worth demonstrating. */
export function withOneNegativeEdge(g: Graph): Graph {
  const edges = g.edges.map(e => ({ ...e }))
  const idx = Math.floor(Math.random() * edges.length)
  edges[idx] = { ...edges[idx], w: -(1 + Math.floor(Math.random() * 4)) }
  const adj: Record<string, GraphEdge[]> = Object.fromEntries(g.nodes.map(n => [n.id, [] as GraphEdge[]]))
  for (const e of edges) adj[e.from].push(e)
  for (const id of Object.keys(adj)) adj[id].sort((a, b) => a.to.localeCompare(b.to))
  return { nodes: g.nodes, edges, adj, start: g.start }
}

function runBellmanFord(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const INF = Number.POSITIVE_INFINITY
  const dist: Record<string, number> = Object.fromEntries(g.nodes.map(n => [n.id, INF]))
  const rounds: string[] = []
  let active: string | null = null
  let remaining: string[] = []

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        activeEdge: active,
        frontier: [...remaining],
        order: [...rounds],
        badges: Object.fromEntries(g.nodes.map(n => [n.id, dist[n.id] === INF ? '∞' : String(dist[n.id])])),
        done,
      },
    })
  }

  push(2, 'Every node starts infinitely far away.')
  dist[g.start] = 0
  push(3, `dist[${g.start}] = 0 — we are already there.`)

  const maxRounds = g.nodes.length - 1
  push(5, `Run ${maxRounds} rounds — one fewer than the node count. A shortest path can use at most that many edges, so this many rounds is always enough.`)

  let round = 0
  for (round = 1; round <= maxRounds; round++) {
    let updated = false
    remaining = g.edges.map(e => `${e.from}→${e.to}·${e.w}`)
    push(6, `Round ${round}: assume nothing changes until proven otherwise.`)
    for (const e of g.edges) {
      active = e.id
      remaining.shift()
      const nd = dist[e.from] + e.w
      if (dist[e.from] !== INF && nd < dist[e.to]) {
        dist[e.to] = nd
        updated = true
        push(9, `dist[${e.from}] + (${e.w}) = ${nd} improves dist[${e.to}] — relax it.`)
      } else {
        push(8, `dist[${e.from}] + (${e.w}) doesn't beat dist[${e.to}] — no change.`)
      }
      active = null
    }
    rounds.push(`round ${round}${updated ? '' : ' — converged'}`)
    push(11, updated
      ? `Round ${round} improved at least one distance.`
      : `Round ${round} changed nothing — every distance is final. Stop early.`)
    if (!updated) break
  }

  active = null
  remaining = g.edges.map(e => `${e.from}→${e.to}·${e.w}`)
  push(14, 'One more pass over every edge: if anything could still improve, a negative cycle exists.')
  for (const e of g.edges) {
    active = e.id
    remaining.shift()
    const nd = dist[e.from] + e.w
    if (dist[e.from] !== INF && nd < dist[e.to]) {
      push(16, `dist[${e.from}] + (${e.w}) still improves dist[${e.to}] — negative cycle detected.`, true)
      return steps
    }
    active = null
  }
  push(16, 'No edge can improve anything further — confirmed safe. (This graph is a DAG, so a negative cycle was never structurally possible — but the check is what makes the algorithm trustworthy on graphs where it is.)')

  const reached = g.nodes.filter(n => dist[n.id] < INF).length
  push(
    18,
    `Done in ${round} round${round === 1 ? '' : 's'} despite the negative edge: shortest distances from ${g.start} to ${reached} of ${g.nodes.length} nodes.`,
    true,
  )
  return steps
}

/* ---------------------------------------------------------------------------
 * A* pathfinding — grid maze, generated + verified reachable before use.
 * ------------------------------------------------------------------------ */

const MAZE_W = 8
const MAZE_H = 6
const WALL_DENSITY = 0.22

function mazeNeighbors(idx: number, w: number, h: number): number[] {
  const r = Math.floor(idx / w)
  const c = idx % w
  const out: number[] = []
  if (r > 0) out.push(idx - w)
  if (r < h - 1) out.push(idx + w)
  if (c > 0) out.push(idx - 1)
  if (c < w - 1) out.push(idx + 1)
  return out
}

function mazeReachable(start: number, goal: number, w: number, h: number, walls: Set<number>): boolean {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const u = queue.shift()!
    if (u === goal) return true
    for (const v of mazeNeighbors(u, w, h)) {
      if (!walls.has(v) && !seen.has(v)) {
        seen.add(v)
        queue.push(v)
      }
    }
  }
  return false
}

export interface MazeInput {
  w: number
  h: number
  walls: number[]
  start: number
  goal: number
}

export function pickMazeInput(): MazeInput {
  const start = 0
  const goal = MAZE_H * MAZE_W - 1
  let walls = new Set<number>()
  for (let attempt = 0; attempt < 30; attempt++) {
    walls = new Set<number>()
    for (let i = 0; i < MAZE_W * MAZE_H; i++) {
      if (i !== start && i !== goal && Math.random() < WALL_DENSITY) walls.add(i)
    }
    if (mazeReachable(start, goal, MAZE_W, MAZE_H, walls)) break
    if (attempt === 29) walls = new Set()
  }
  return { w: MAZE_W, h: MAZE_H, walls: [...walls], start, goal }
}

function manhattan(a: number, b: number, w: number): number {
  const ar = Math.floor(a / w), ac = a % w
  const br = Math.floor(b / w), bc = b % w
  return Math.abs(ar - br) + Math.abs(ac - bc)
}

function runAStar({ w, h, walls, start, goal }: MazeInput): AlgoStep[] {
  const steps: AlgoStep[] = []
  const wallSet = new Set(walls)
  const g: Record<number, number> = { [start]: 0 }
  const cameFrom: Record<number, number> = {}
  const openHeap: Array<[number, number]> = [[manhattan(start, goal, w), start]]
  const openSet = new Set([start])
  const closed = new Set<number>()
  const scores: Record<number, string> = { [start]: `g0 h${manhattan(start, goal, w)} f${manhattan(start, goal, w)}` }
  let current: number | null = null
  let path: number[] = []

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        mazeW: w,
        mazeH: h,
        mazeWalls: walls,
        mazeStart: start,
        mazeGoal: goal,
        mazeOpen: [...openSet],
        mazeClosed: [...closed],
        mazeCurrent: current,
        mazePath: [...path],
        mazeScores: { ...scores },
        done,
      },
    })
  }

  push(4, `g[start] = 0 — zero steps to reach itself.`)
  push(5, `Open set seeds with start; priority = h(start) = ${manhattan(start, goal, w)}, the Manhattan distance to the goal.`)

  while (openHeap.length) {
    openHeap.sort((a, b) => a[0] - b[0])
    const [f, cur] = openHeap.shift()!
    openSet.delete(cur)
    current = cur
    push(9, `Pop lowest f = ${f}: cell ${cur}. Lower f means "closer to a short path through here to the goal."`)

    if (cur === goal) {
      const built = [cur]
      let c = cur
      while (cameFrom[c] !== undefined) {
        c = cameFrom[c]
        built.push(c)
      }
      built.reverse()
      path = built
      current = null
      push(11, `Reached the goal — walk came_from back to the start: ${built.length - 1} moves.`, true)
      return steps
    }

    closed.add(cur)
    for (const nxt of mazeNeighbors(cur, w, h)) {
      if (wallSet.has(nxt)) continue
      const tentative = g[cur] + 1
      if (tentative < (g[nxt] ?? Number.POSITIVE_INFINITY)) {
        cameFrom[nxt] = cur
        g[nxt] = tentative
        const hn = manhattan(nxt, goal, w)
        const fn = tentative + hn
        scores[nxt] = `g${tentative} h${hn} f${fn}`
        openHeap.push([fn, nxt])
        openSet.add(nxt)
        push(19, `Cell ${nxt}: g=${tentative} via ${cur}, h=${hn}, f=${fn} — best route found so far. Add to open set.`)
      } else if (g[nxt] !== undefined) {
        push(15, `Cell ${nxt} already reachable at g=${g[nxt]} — this route (g=${tentative}) isn't better.`)
      }
    }
    current = null
  }

  push(21, 'Open set emptied without reaching the goal.', true)
  return steps
}

/* ---------------------------------------------------------------------------
 * N-Queens — backtracking.
 * ------------------------------------------------------------------------ */

export function pickQueensN(): number {
  const opts = [5, 6, 7]
  return opts[Math.floor(Math.random() * opts.length)]
}

function runNQueens(n: number): AlgoStep[] {
  const steps: AlgoStep[] = []
  const board: number[] = Array(n).fill(-1)
  let col: number | null = null
  let tryRow: number | null = null
  let conflict: [number, number] | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        queensN: n,
        queensBoard: [...board],
        queensCol: col,
        queensTryRow: tryRow,
        queensConflict: conflict,
        done,
      },
    })
  }

  const isSafe = (row: number, c: number): [boolean, [number, number] | null] => {
    for (let cc = 0; cc < c; cc++) {
      const r = board[cc]
      if (r === row || Math.abs(r - row) === Math.abs(cc - c)) return [false, [r, cc]]
    }
    return [true, null]
  }

  const solve = (c: number): boolean => {
    col = c
    if (c === n) {
      tryRow = null
      conflict = null
      push(3, `Column ${n} reached — every column holds a queen. Solved!`, true)
      return true
    }
    push(5, `Column ${c}: try each row top to bottom.`)
    for (let row = 0; row < n; row++) {
      tryRow = row
      conflict = null
      push(6, `Check row ${row} in column ${c}.`)
      const [safe, conf] = isSafe(row, c)
      if (!safe) {
        conflict = conf
        push(18, `Blocked — attacked from (row ${conf![0]}, col ${conf![1]}): same row or diagonal.`)
        conflict = null
        continue
      }
      board[c] = row
      tryRow = null
      push(7, `Clear. Place the queen at (row ${row}, col ${c}).`)
      if (solve(c + 1)) return true
      board[c] = -1
      tryRow = null
      push(10, `Dead end further down — undo: remove the queen from column ${c}.`)
    }
    push(12, `No row works in column ${c} — backtrack to column ${c - 1}.`)
    return false
  }

  push(1, `Solve ${n}-Queens: place one queen per column so none attack another.`)
  solve(0)
  col = null
  return steps
}

function runBubble(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  const locked: number[] = []
  let compare: number[] = []

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: { ...emptyState(), array: [...a], compare: [...compare], locked: [...locked], done },
    })
  }

  push(2, `n = ${n} values, unsorted.`)
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    for (let j = 0; j < n - 1 - i; j++) {
      compare = [j, j + 1]
      push(6, `Compare a[${j}] = ${a[j]} and a[${j + 1}] = ${a[j + 1]}.`)
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        swapped = true
        push(7, `${a[j + 1]} > ${a[j]} — swap them.`)
      }
    }
    compare = []
    locked.push(n - 1 - i)
    push(3, `Pass ${i + 1} done: ${a[n - 1 - i]} bubbled into its final slot.`)
    if (!swapped) {
      for (let k = 0; k < n; k++) if (!locked.includes(k)) locked.push(k)
      push(10, 'A full pass with zero swaps — everything is already sorted.')
      break
    }
  }
  for (let k = 0; k < n; k++) if (!locked.includes(k)) locked.push(k)
  push(11, 'Sorted.', true)
  return steps
}

function runInsertion(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  let compare: number[] = []
  let cursors: Record<string, number> = {}
  let sortedUpto = 0 // prefix [0..sortedUpto] is sorted-so-far

  const push = (line: number, note: string, done = false) => {
    const locked = done
      ? a.map((_, k) => k)
      : Array.from({ length: sortedUpto + 1 }, (_, k) => k)
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: [...compare],
        locked,
        cursors: { ...cursors },
        done,
      },
    })
  }

  push(1, `The first value alone is a sorted prefix of length 1.`)
  for (let i = 1; i < n; i++) {
    const key = a[i]
    cursors = { i, j: i - 1 }
    compare = [i]
    push(3, `Pull out key = ${key}.`)
    let j = i - 1
    while (j >= 0 && a[j] > key) {
      compare = [j]
      push(6, `a[${j}] = ${a[j]} > ${key} — it must move right.`)
      a[j + 1] = a[j]
      j -= 1
      cursors = { i, j }
      push(7, `Shift ${a[j + 2]} into slot ${j + 2}.`)
    }
    a[j + 1] = key
    compare = [j + 1]
    sortedUpto = i
    push(9, `Drop ${key} into slot ${j + 1} — prefix of ${i + 1} is sorted.`)
  }
  compare = []
  cursors = {}
  push(10, 'Sorted.', true)
  return steps
}

function runQuicksort(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  const locked: number[] = []
  let compare: number[] = []
  let cursors: Record<string, number> = {}
  let winLo = 0
  let winHi = n - 1

  const push = (line: number, note: string, done = false) => {
    // Ghost everything outside the active partition window (except settled
    // pivots) so the eye follows the recursion.
    const discarded = done
      ? []
      : a.map((_, k) => k).filter(k => (k < winLo || k > winHi) && !locked.includes(k))
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: [...compare],
        locked: done ? a.map((_, k) => k) : [...locked],
        discarded,
        cursors: { ...cursors },
        done,
      },
    })
  }

  const sort = (lo: number, hi: number, depth: number) => {
    if (lo > hi) return
    winLo = lo
    winHi = hi
    if (lo === hi) {
      locked.push(lo)
      cursors = { lo, hi }
      compare = []
      push(5, `a[${lo}] = ${a[lo]} is alone in its window — already in place.`)
      return
    }
    const pivot = a[hi]
    cursors = { lo, hi, p: hi }
    compare = [hi]
    push(7, `Window [${lo}..${hi}] (depth ${depth}): pivot = a[${hi}] = ${pivot}.`)
    let i = lo
    cursors = { lo, hi, p: hi, i }
    compare = []
    push(8, `i = ${lo} marks where the next small value will land.`)
    for (let j = lo; j < hi; j++) {
      cursors = { lo, hi, p: hi, i, j }
      compare = [j]
      push(10, `a[${j}] = ${a[j]} vs pivot ${pivot}.`)
      if (a[j] < pivot) {
        const moved = a[j]
        ;[a[i], a[j]] = [a[j], a[i]]
        push(
          11,
          i === j
            ? `${moved} is already inside the small zone.`
            : `${moved} joins the small zone: swap a[${i}] ↔ a[${j}].`,
        )
        i += 1
        cursors = { lo, hi, p: hi, i, j }
      }
    }
    ;[a[i], a[hi]] = [a[hi], a[i]]
    locked.push(i)
    compare = []
    cursors = { lo, hi, i }
    push(13, `Pivot ${a[i]} drops into slot ${i} — its final position, forever.`)
    sort(lo, i - 1, depth + 1)
    sort(i + 1, hi, depth + 1)
  }

  sort(0, n - 1, 0)
  winLo = 0
  winHi = n - 1
  compare = []
  cursors = {}
  push(17, 'Sorted — every pivot locked in one partition sweep.', true)
  return steps
}

function runMergesort(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  let compare: number[] = []
  let cursors: Record<string, number> = {}
  let winLo = 0
  let winHi = n - 1

  const push = (line: number, note: string, done = false) => {
    const discarded = done ? [] : a.map((_, k) => k).filter(k => k < winLo || k > winHi)
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: [...compare],
        locked: done ? a.map((_, k) => k) : [],
        discarded,
        cursors: { ...cursors },
        done,
      },
    })
  }

  const sort = (lo: number, hi: number, depth: number) => {
    winLo = lo
    winHi = hi
    if (lo >= hi) {
      cursors = { lo, hi }
      compare = [lo]
      push(5, `a[${lo}] = ${a[lo]} alone — trivially sorted.`)
      compare = []
      return
    }
    const mid = Math.floor((lo + hi) / 2)
    cursors = { lo, mid, hi }
    compare = []
    push(7, `Split [${lo}..${hi}] at mid = ${mid} (depth ${depth}).`)
    push(8, `Recurse into the left half [${lo}..${mid}].`)
    sort(lo, mid, depth + 1)
    winLo = lo
    winHi = hi
    cursors = { lo, mid, hi }
    push(9, `Left half sorted. Now the right half [${mid + 1}..${hi}].`)
    sort(mid + 1, hi, depth + 1)
    winLo = lo
    winHi = hi
    cursors = { lo, mid, hi }

    const left = a.slice(lo, mid + 1)
    const right = a.slice(mid + 1, hi + 1)
    push(12, `Both halves sorted: left [${left.join(', ')}], right [${right.join(', ')}]. Zip them.`)
    let i = 0
    let j = 0
    let k = lo
    while (i < left.length && j < right.length) {
      compare = [k]
      cursors = { lo, hi, k }
      push(17, `Smaller front: left offers ${left[i]}, right offers ${right[j]}.`)
      if (left[i] <= right[j]) {
        a[k] = left[i]
        i += 1
        push(18, `Take ${a[k]} from the left half → slot ${k}.`)
      } else {
        a[k] = right[j]
        j += 1
        push(20, `Take ${a[k]} from the right half → slot ${k}.`)
      }
      k += 1
    }
    const fromLeft = i < left.length
    const rest = fromLeft ? left.slice(i) : right.slice(j)
    if (rest.length) {
      for (let m = 0; m < rest.length; m++) a[k + m] = rest[m]
      compare = []
      cursors = { lo, hi, k }
      push(22, `${fromLeft ? 'Left' : 'Right'} half's leftovers slide in: [${rest.join(', ')}].`)
    }
    compare = []
  }

  sort(0, n - 1, 0)
  compare = []
  cursors = {}
  push(23, 'Sorted — log n levels of splitting, one linear merge per level.', true)
  return steps
}

function runBinarySearch(sorted: number[], target: number): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...sorted]
  let lo = 0
  let hi = a.length - 1
  let mid: number | null = null
  let found: number | null = null

  const push = (line: number, note: string, done = false) => {
    const discarded = a.map((_, k) => k).filter(k => k < lo || k > hi)
    const cursors: Record<string, number> = { lo, hi }
    if (mid !== null) cursors.mid = mid
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: mid !== null && found === null ? [mid] : [],
        discarded,
        cursors,
        foundIndex: found,
        done,
      },
    })
  }

  push(2, `Search window is the whole array: lo = 0, hi = ${hi}. Target: ${target}.`)
  while (lo <= hi) {
    mid = Math.floor((lo + hi) / 2)
    push(5, `mid = (${lo} + ${hi}) // 2 = ${mid}.`)
    if (a[mid] === target) {
      found = mid
      push(7, `a[${mid}] = ${target} — found it in ${steps.filter(s => s.line === 5).length} probes.`, true)
      return steps
    }
    if (a[mid] < target) {
      lo = mid + 1
      push(9, `a[${mid}] = ${a[mid]} < ${target}: everything left of mid is too small. lo = ${lo}.`)
    } else {
      hi = mid - 1
      push(11, `a[${mid}] = ${a[mid]} > ${target}: everything right of mid is too big. hi = ${hi}.`)
    }
    mid = null
  }
  push(4, `lo (${lo}) has crossed hi (${hi}) — the window is empty.`)
  push(13, `${target} is not in the array: return -1.`, true)
  return steps
}

/** Complete-binary-tree layout: heap index → canvas position. */
function heapLayout(len: number, values: number[]): TreeNodeSnap[] {
  const nodes: TreeNodeSnap[] = []
  for (let i = 0; i < len; i++) {
    const d = Math.floor(Math.log2(i + 1))
    const k = i - (2 ** d - 1)
    nodes.push({ id: i, value: values[i], x: (k + 0.5) * (640 / 2 ** d), y: 52 + d * 105 })
  }
  return nodes
}

function runHeap(values: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a: number[] = []
  const popped: number[] = []
  let active: number[] = []
  let focus: number | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        treeNodes: heapLayout(a.length, a),
        treeLinks: a.slice(1).map((_, j) => [(j + 1 - 1) >> 1, j + 1] as [number, number]),
        treeActive: [...active],
        treeFocus: focus,
        order: popped.map(String),
        done,
      },
    })
  }

  for (const x of values) {
    a.push(x)
    focus = a.length - 1
    active = []
    push(6, `push(${x}): append at index ${a.length - 1} — the next free leaf.`)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      active = [p, i]
      push(10, `Parent a[${p}] = ${a[p]} vs new a[${i}] = ${a[i]}.`)
      if (a[p] <= a[i]) {
        push(11, `${a[p]} ≤ ${a[i]} — heap property holds, stop sifting.`)
        break
      }
      const child = a[i]
      ;[a[p], a[i]] = [a[i], a[p]]
      push(12, `${child} bubbles up to index ${p}.`)
      i = p
      focus = i
    }
    active = []
    focus = null
  }

  push(16, `Heap built from ${values.length} pushes. Now pop the minimum three times.`)
  for (let round = 0; round < 3; round++) {
    const min = a[0]
    const last = a[a.length - 1]
    active = [0, a.length - 1]
    focus = 0
    ;[a[0], a[a.length - 1]] = [a[a.length - 1], a[0]]
    push(18, `Swap min ${min} with last leaf ${last} — removal at the end is O(1).`)
    a.pop()
    popped.push(min)
    active = []
    push(19, `Detach ${min}. New root ${a[0]} probably breaks the heap — sift it down.`)
    let i = 0
    while (true) {
      const l = 2 * i + 1
      const r = 2 * i + 2
      let s = i
      if (l < a.length && a[l] < a[s]) s = l
      if (r < a.length && a[r] < a[s]) s = r
      active = [i, l, r].filter(k => k < a.length)
      if (l >= a.length) {
        push(24, `a[${i}] = ${a[i]} has no children — nowhere lower to go.`)
      } else {
        push(24, `Family: a[${i}] = ${a[i]}, children ${a[l]}${r < a.length ? ` and ${a[r]}` : ''}. Smallest: ${a[s]}.`)
      }
      if (s === i) {
        push(27, `${a[i]} ≤ its children — settled.`)
        break
      }
      const sink = a[i]
      ;[a[i], a[s]] = [a[s], a[i]]
      push(28, `${sink} sinks; ${a[i]} rises to index ${i}.`)
      i = s
      focus = i
    }
    active = []
    focus = null
    push(30, `return ${min} — extraction ${round + 1} done.`)
  }
  push(30, `Extracted ${popped.join(', ')} — in sorted order. Repeat n times and you have heapsort.`, true)
  return steps
}

interface BSTNode {
  id: number
  v: number
  left: number | null
  right: number | null
}

function runBST(values: number[], target: number): AlgoStep[] {
  const steps: AlgoStep[] = []
  const nodes: BSTNode[] = []
  let root: number | null = null
  let active: number[] = []
  let visited: number[] = []
  let focus: number | null = null
  let found: number | null = null

  /** In-order rank → x, depth → y; recomputed per snapshot as the tree grows. */
  const layout = (): { snaps: TreeNodeSnap[]; links: Array<[number, number]> } => {
    const snaps: TreeNodeSnap[] = []
    const links: Array<[number, number]> = []
    if (root === null) return { snaps, links }
    const depths = new Map<number, number>()
    let rank = 0
    let maxDepth = 0
    const walk = (id: number, depth: number) => {
      const n = nodes[id]
      depths.set(id, depth)
      maxDepth = Math.max(maxDepth, depth)
      if (n.left !== null) {
        links.push([id, n.left])
        walk(n.left, depth + 1)
      }
      const x = 40 + (rank + 0.5) * (560 / nodes.length)
      rank += 1
      snaps.push({ id, value: n.v, x, y: 0 })
      if (n.right !== null) {
        links.push([id, n.right])
        walk(n.right, depth + 1)
      }
    }
    walk(root, 0)
    const spacing = Math.min(95, 330 / Math.max(1, maxDepth))
    for (const s of snaps) s.y = 44 + depths.get(s.id)! * spacing
    return { snaps, links }
  }

  const push = (line: number, note: string, done = false) => {
    const { snaps, links } = layout()
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        treeNodes: snaps,
        treeLinks: links,
        treeActive: [...active],
        treeVisited: [...visited],
        treeFocus: focus,
        foundIndex: found,
        done,
      },
    })
  }

  for (const v of values) {
    active = []
    visited = []
    if (root === null) {
      nodes.push({ id: 0, v, left: null, right: null })
      root = 0
      focus = 0
      push(3, `Tree empty — ${v} becomes the root.`)
      focus = null
      continue
    }
    let cur = root
    while (true) {
      active = [cur]
      visited = [...visited, cur]
      const goLeft = v < nodes[cur].v
      push(4, `${v} vs ${nodes[cur].v}: ${v} is ${goLeft ? 'smaller — left' : 'bigger (or equal) — right'}.`)
      const child = goLeft ? nodes[cur].left : nodes[cur].right
      if (child === null) {
        const id = nodes.length
        nodes.push({ id, v, left: null, right: null })
        if (goLeft) nodes[cur].left = id
        else nodes[cur].right = id
        focus = id
        active = []
        push(3, `${nodes[cur].v}'s ${goLeft ? 'left' : 'right'} slot is empty — ${v} leafs there.`)
        focus = null
        break
      }
      cur = child
      push(goLeft ? 5 : 7, `Descend ${goLeft ? 'left' : 'right'} to ${nodes[cur].v}.`)
    }
  }

  active = []
  visited = []
  push(11, `Tree built. Now search for ${target}.`)
  let cur: number | null = root
  let hops = 0
  while (cur !== null) {
    active = [cur]
    visited = [...visited, cur]
    hops += 1
    push(12, `${target} vs ${nodes[cur].v}.`)
    if (target === nodes[cur].v) {
      found = cur
      push(13, `Found ${target} in ${hops} comparison${hops === 1 ? '' : 's'} — the shape did the binary search.`, true)
      return steps
    }
    const goLeft = target < nodes[cur].v
    const child: number | null = goLeft ? nodes[cur].left : nodes[cur].right
    push(14, child === null
      ? `${goLeft ? 'Left' : 'Right'} child is None — dead end.`
      : `Go ${goLeft ? 'left' : 'right'}.`)
    cur = child
  }
  push(16, `${target} is not in the tree — return False after only ${hops} comparisons.`, true)
  return steps
}

function runLinkedList(values: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const n = values.length
  // Slot i holds values[i] forever; only the arrows (next) change.
  const next: Array<number | null> = values.map((_, i) => (i < n - 1 ? i + 1 : null))
  let prev: number | null = null
  let curr: number | null = 0
  let nxt: number | null = null
  let activeNode: number | null = null

  const push = (line: number, note: string, done = false) => {
    const cursors: Record<string, number> = {}
    if (prev !== null) cursors.prev = prev
    if (curr !== null) cursors.curr = curr
    if (nxt !== null) cursors.nxt = nxt
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        listValues: [...values],
        listNext: [...next],
        listActive: activeNode,
        cursors,
        done,
      },
    })
  }

  push(7, 'prev = None — the reversed part is empty so far.')
  push(8, `curr starts at the head (${values[0]}).`)
  while (curr !== null) {
    nxt = next[curr]
    activeNode = null
    push(10, nxt === null
      ? `Save next: None — ${values[curr]} is the last node.`
      : `Save next = ${values[nxt]} first, or the rest of the list is lost.`)
    next[curr] = prev
    activeNode = curr
    push(11, prev === null
      ? `Flip: ${values[curr]} now points to None — it will be the tail.`
      : `Flip: ${values[curr]} now points back to ${values[prev]}.`)
    prev = curr
    activeNode = null
    push(12, `prev advances to ${values[prev]}.`)
    curr = nxt
    push(13, curr === null
      ? 'curr = None — we ran off the end.'
      : `curr advances to ${values[curr]}.`)
  }
  nxt = null
  push(14, `return ${prev !== null ? values[prev] : '?'} — the new head. Every arrow now points the other way.`, true)
  return steps
}

/** Word groups sharing a prefix — two groups per trie so branches merge visibly. */
const WORD_GROUPS: Array<{ prefix: string; words: string[] }> = [
  { prefix: 'ca', words: ['car', 'cat', 'care', 'can', 'cart'] },
  { prefix: 'do', words: ['dog', 'dot', 'dose', 'do', 'dome'] },
  { prefix: 'te', words: ['tea', 'team', 'teach', 'ten', 'tent'] },
  { prefix: 'su', words: ['sun', 'sung', 'sunny', 'sum', 'surf'] },
  { prefix: 'ba', words: ['bat', 'bath', 'bad', 'ban', 'bar'] },
]

export function pickTrieInput(): { words: string[]; prefix: string } {
  const [a, b] = shuffle(WORD_GROUPS).slice(0, 2)
  const words = [...shuffle(a.words).slice(0, 3), ...shuffle(b.words).slice(0, 3)]
  return { words, prefix: a.prefix }
}

interface TrieNode {
  id: number
  ch: string
  kids: Record<string, number>
  isWord: boolean
}

function runTrie(words: string[], prefix: string): AlgoStep[] {
  const steps: AlgoStep[] = []
  const nodes: TrieNode[] = [{ id: 0, ch: '·', kids: {}, isWord: false }]
  const completions: string[] = []
  let active: number[] = []
  let visited: number[] = []
  let focus: number | null = null
  let found: number | null = null

  /** Leaves claim x slots left→right; parents center over their children. */
  const layout = (): { snaps: TreeNodeSnap[]; links: Array<[number, number]> } => {
    const snaps: TreeNodeSnap[] = []
    const links: Array<[number, number]> = []
    let leaf = 0
    let maxDepth = 1
    const place = (id: number, depth: number): number => {
      maxDepth = Math.max(maxDepth, depth)
      const kidIds = Object.keys(nodes[id].kids).sort().map(c => nodes[id].kids[c])
      let x: number
      if (!kidIds.length) {
        leaf += 1
        x = leaf
      } else {
        const xs = kidIds.map((k) => {
          links.push([id, k])
          return place(k, depth + 1)
        })
        x = (xs[0] + xs[xs.length - 1]) / 2
      }
      snaps.push({ id, value: nodes[id].ch, x, y: depth })
      return x
    }
    place(0, 0)
    const spacing = Math.min(85, 330 / maxDepth)
    for (const s of snaps) {
      s.x = 40 + (s.x - 0.5) * (560 / Math.max(1, leaf))
      s.y = 40 + s.y * spacing
    }
    return { snaps, links }
  }

  const push = (line: number, note: string, done = false) => {
    const { snaps, links } = layout()
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        treeNodes: snaps,
        treeLinks: links,
        treeActive: [...active],
        treeVisited: [...visited],
        treeFocus: focus,
        treeEnds: nodes.filter(n => n.isWord).map(n => n.id),
        foundIndex: found,
        order: [...completions],
        done,
      },
    })
  }

  for (const word of words) {
    let node = 0
    active = []
    visited = [0]
    focus = null
    push(7, `insert("${word}") — every word starts at the root.`)
    for (const ch of word) {
      active = [node]
      if (!(ch in nodes[node].kids)) {
        const id = nodes.length
        nodes.push({ id, ch, kids: {}, isWord: false })
        nodes[node].kids[ch] = id
        focus = id
        push(10, `No '${ch}' branch here — grow one.`)
      } else {
        focus = nodes[node].kids[ch]
        push(9, `'${ch}' branch already exists — shared prefix, shared path.`)
      }
      node = nodes[node].kids[ch]
      visited = [...visited, node]
      push(11, `Step down to '${ch}'.`)
    }
    nodes[node].isWord = true
    active = []
    push(12, `Ring the node: "${word}" ends here.`)
    focus = null
  }

  // complete(prefix)
  active = []
  visited = [0]
  focus = null
  push(15, `complete("${prefix}") — walk the prefix first.`)
  let node = 0
  for (const ch of prefix) {
    active = [node]
    if (!(ch in nodes[node].kids)) {
      push(18, `No '${ch}' branch — nothing starts with "${prefix}".`, true)
      return steps
    }
    node = nodes[node].kids[ch]
    visited = [...visited, node]
    focus = node
    push(19, `Follow '${ch}'.`)
  }
  active = []
  push(20, `Prefix walked in ${prefix.length} steps. Everything below this node starts with "${prefix}".`)
  const gather = (id: number, word: string) => {
    visited = [...visited, id]
    if (nodes[id].isWord) {
      completions.push(word)
      found = id
      push(21, `"${word}" — completion #${completions.length}.`)
      found = null
    }
    for (const ch of Object.keys(nodes[id].kids).sort()) {
      gather(nodes[id].kids[ch], word + ch)
    }
  }
  gather(node, prefix)
  push(21, `Autocomplete for "${prefix}": ${completions.join(', ')}.`, true)
  return steps
}

function runHashTable(keys: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const buckets: number[][] = Array.from({ length: HASH_BUCKETS }, () => [])
  const pending = [...keys]
  let activeKey: number | null = null
  let activeBucket: number | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        buckets: buckets.map(b => [...b]),
        pendingKeys: [...pending],
        activeKey,
        activeBucket,
        done,
      },
    })
  }

  push(3, `${HASH_BUCKETS} empty buckets. ${keys.length} keys waiting to move in.`)
  for (const key of keys) {
    activeKey = key
    activeBucket = null
    const h = key % HASH_BUCKETS
    push(8, `hash(${key}) = ${key} % ${HASH_BUCKETS} = ${h} — computed, not searched.`)
    activeBucket = h
    const chain = buckets[h]
    push(10, chain.length
      ? `Bucket ${h} already holds [${chain.join(', ')}] — ${key} is not among them.`
      : `Bucket ${h} is empty — no duplicates possible.`)
    chain.push(key)
    pending.shift()
    push(12, chain.length > 1
      ? `Collision! ${key} chains behind ${chain.slice(0, -1).join(', ')} in bucket ${h}.`
      : `${key} moves into bucket ${h}.`)
  }
  activeKey = null
  activeBucket = null
  const longest = Math.max(...buckets.map(b => b.length))
  push(
    12,
    `All stored. Load factor ${keys.length}/${HASH_BUCKETS} ≈ ${(keys.length / HASH_BUCKETS).toFixed(1)}, longest chain ${longest} — lookups cost about that.`,
    true,
  )
  return steps
}

interface LRUInput {
  cap: number
  keys: number[]
  values: number[]
  updateValue: number
}

export function pickLRUInput(): LRUInput {
  const keys = randomValues(5)
  const values = randomValues(5)
  const updateValue = randomValues(1)[0]
  return { cap: 3, keys, values, updateValue }
}

function runLRU({ cap, keys, values, updateValue }: LRUInput): AlgoStep[] {
  const steps: AlgoStep[] = []
  const list: Array<{ key: number; value: number }> = []
  const opsLog: string[] = []
  let evicted: number | null = null

  type Op = { verb: 'get' | 'put'; key: number; value?: number; label: string }
  const plan: Op[] = [
    { verb: 'put', key: keys[0], value: values[0], label: `put(${keys[0]}, ${values[0]})` },
    { verb: 'put', key: keys[1], value: values[1], label: `put(${keys[1]}, ${values[1]})` },
    { verb: 'put', key: keys[2], value: values[2], label: `put(${keys[2]}, ${values[2]})` },
    { verb: 'get', key: keys[0], label: `get(${keys[0]})` },
    { verb: 'put', key: keys[3], value: values[3], label: `put(${keys[3]}, ${values[3]})` },
    { verb: 'get', key: keys[1], label: `get(${keys[1]})` },
    { verb: 'put', key: keys[4], value: values[4], label: `put(${keys[4]}, ${values[4]})` },
    { verb: 'put', key: keys[0], value: updateValue, label: `put(${keys[0]}, ${updateValue})` },
  ]
  const opsQueue = plan.map(o => o.label)

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        lruList: list.map(n => ({ ...n })),
        lruCap: cap,
        lruEvicted: evicted,
        opsQueue: [...opsQueue],
        opsLog: [...opsLog],
        done,
      },
    })
  }

  push(7, `Capacity ${cap}: at most ${cap} entries kept. ${plan.length} operations queued.`)

  for (const op of plan) {
    opsQueue.shift()
    evicted = null
    if (op.verb === 'get') {
      const idx = list.findIndex(n => n.key === op.key)
      if (idx === -1) {
        opsLog.push(`${op.label} → miss`)
        push(25, `${op.label}: key ${op.key} is not in the map — return -1.`)
        continue
      }
      const [node] = list.splice(idx, 1)
      push(28, `${op.label}: found it — unlink node ${op.key} from wherever it sits.`)
      list.unshift(node)
      opsLog.push(`${op.label} → hit ${node.value}`)
      push(29, `Push ${op.key} to the front — being read just made it most recent.`)
      continue
    }
    // put
    const idx = list.findIndex(n => n.key === op.key)
    if (idx !== -1) {
      list.splice(idx, 1)
      push(33, `${op.label}: key ${op.key} already cached — unlink the old node first.`)
    }
    list.unshift({ key: op.key, value: op.value! })
    push(37, `${op.label}: push the new node to the front — most recently used.`)
    if (list.length > cap) {
      const stale = list.pop()!
      evicted = stale.key
      opsLog.push(`${op.label} → evicted ${stale.key}`)
      push(40, `Over capacity: drop the tail — key ${stale.key} was least recently used.`)
    } else {
      opsLog.push(op.label)
    }
  }

  evicted = null
  push(
    41,
    `Done. Final cache, most- to least-recently-used: ${list.map(n => n.key).join(' → ')}.`,
    true,
  )
  return steps
}

function randomInRange(n: number, min: number, max: number): number[] {
  const vals = new Set<number>()
  while (vals.size < n) vals.add(min + Math.floor(Math.random() * (max - min + 1)))
  return shuffle([...vals])
}

interface KnapsackInput {
  weights: number[]
  values: number[]
  cap: number
}

export function pickKnapsackInput(): KnapsackInput {
  return {
    weights: randomInRange(5, 2, 7),
    values: randomInRange(5, 4, 22),
    cap: 10 + Math.floor(Math.random() * 5), // 10–14: keeps the grid readable
  }
}

function runKnapsack({ weights, values, cap }: KnapsackInput): AlgoStep[] {
  const steps: AlgoStep[] = []
  const n = weights.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(-1))
  const rowLabels = ['∅', ...weights.map((w, i) => `w${i + 1}=${w}, v=${values[i]}`)]
  const colLabels = Array.from({ length: cap + 1 }, (_, c) => String(c))
  let active: [number, number] | null = null
  let source: Array<[number, number]> = []
  let path: Array<[number, number]> = []
  const chosen: string[] = []

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        gridValues: dp.map(row => [...row]),
        gridRowLabels: rowLabels,
        gridColLabels: colLabels,
        gridActive: active,
        gridSource: [...source],
        gridPath: [...path],
        order: [...chosen],
        done,
      },
    })
  }

  for (let c = 0; c <= cap; c++) dp[0][c] = 0
  push(3, 'Row 0 = zero items available: 0 value no matter the capacity. The base case needs no work.')

  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1]
    const v = values[i - 1]
    push(6, `Item ${i}: weight ${w}, value ${v}. Fill this row using only row ${i - 1} — the row above.`)
    for (let c = 0; c <= cap; c++) {
      active = [i, c]
      const skipVal = dp[i - 1][c]
      if (w > c) {
        source = [[i - 1, c]]
        dp[i][c] = skipVal
        push(9, `Item ${i} (weight ${w}) doesn't fit in capacity ${c} — must skip: dp[${i}][${c}] = ${skipVal}.`)
      } else {
        const take = v + dp[i - 1][c - w]
        source = [[i - 1, c], [i - 1, c - w]]
        dp[i][c] = Math.max(skipVal, take)
        push(11, `dp[${i}][${c}] = max(skip → ${skipVal}, take → ${v} + dp[${i - 1}][${c - w}] = ${take}) = ${dp[i][c]}.`)
      }
    }
    active = null
    source = []
  }

  push(13, `Filled. dp[${n}][${cap}] = ${dp[n][cap]} is the best value — now trace back which items got picked.`)
  path = [[n, cap]]
  let bc = cap
  for (let i = n; i >= 1; i--) {
    active = [i, bc]
    if (dp[i][bc] !== dp[i - 1][bc]) {
      chosen.unshift(`item ${i}`)
      bc -= weights[i - 1]
      path.push([i - 1, bc])
      push(13, `dp[${i}][…] ≠ dp[${i - 1}][…] here — item ${i} was taken. Capacity left: ${bc}.`)
    } else {
      path.push([i - 1, bc])
      push(13, `dp[${i}][…] = dp[${i - 1}][…] here — item ${i} was skipped.`)
    }
  }
  active = null
  push(
    13,
    `Optimal picks: ${chosen.join(', ')}. Total value ${dp[n][cap]} at weight ≤ ${cap} — found by filling ${(n + 1) * (cap + 1)} cells once each, never re-solving a subproblem.`,
    true,
  )
  return steps
}

/* ---------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------ */

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
  const step = computed<AlgoStep | undefined>(() => trace.value[stepIndex.value])
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
