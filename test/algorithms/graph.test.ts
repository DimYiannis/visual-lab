import { describe, it, expect } from 'vitest'
import type { Graph, GraphEdge, GraphNode } from '../../lib/algorithms/graph'
import { runKahn, runBFS, runDFS, runDijkstra, runKruskal, runBellmanFord } from '../../lib/algorithms/runners/graph'

/**
 * Fixed 5-node DAG, hand-verifiable shortest paths and MST — deliberately
 * not using randomDAG() here so results are checkable by hand, not just
 * self-consistent. A>B(2) A>C(5) B>C(1) B>D(4) C>D(1) C>E(7) D>E(2), E is a
 * sink. Shortest paths from A (worked by hand): B=2, C=3 (via B), D=4 (via
 * B→C→D), E=6 (via B→C→D→E).
 */
function buildGraph(edgeSpecs: Array<[string, string, number]>): Graph {
  const nodeIds = [...new Set(edgeSpecs.flatMap(([f, t]) => [f, t]))].sort()
  const nodes: GraphNode[] = nodeIds.map(id => ({ id, x: 0, y: 0 }))
  const edges: GraphEdge[] = edgeSpecs.map(([from, to, w]) => ({ id: `${from}>${to}`, from, to, w }))
  const adj: Record<string, GraphEdge[]> = Object.fromEntries(nodeIds.map(id => [id, [] as GraphEdge[]]))
  for (const e of edges) adj[e.from].push(e)
  for (const id of nodeIds) adj[id].sort((a, b) => a.to.localeCompare(b.to))
  return { nodes, edges, adj, start: 'A' }
}

const STANDARD_GRAPH = buildGraph([
  ['A', 'B', 2], ['A', 'C', 5], ['B', 'C', 1], ['B', 'D', 4], ['C', 'D', 1], ['C', 'E', 7], ['D', 'E', 2],
])

function lastState<T extends { state: unknown }>(steps: T[]) {
  return steps[steps.length - 1].state as { badges: Record<string, string>; order: string[]; done: boolean }
}

describe("Kahn's topological sort", () => {
  it('produces a valid topological order (every edge points forward in it)', () => {
    const steps = runKahn(STANDARD_GRAPH)
    const order = lastState(steps).order
    expect(order).toHaveLength(STANDARD_GRAPH.nodes.length)
    for (const e of STANDARD_GRAPH.edges) {
      expect(order.indexOf(e.from)).toBeLessThan(order.indexOf(e.to))
    }
  })
})

describe('BFS / DFS', () => {
  it.each([['BFS', runBFS], ['DFS', runDFS]] as const)('%s visits every reachable node exactly once, starting from A', (_name, run) => {
    const steps = run(STANDARD_GRAPH)
    const order = lastState(steps).order
    expect(order[0]).toBe('A')
    expect(new Set(order).size).toBe(order.length) // no repeats
    expect(new Set(order)).toEqual(new Set(STANDARD_GRAPH.nodes.map(n => n.id)))
  })
})

describe("Dijkstra's shortest paths", () => {
  it('matches hand-computed shortest distances', () => {
    const steps = runDijkstra(STANDARD_GRAPH)
    const badges = lastState(steps).badges
    expect(badges).toEqual({ A: '0', B: '2', C: '3', D: '4', E: '6' })
  })

  it('reports unreachable nodes as infinite', () => {
    const disconnected = buildGraph([['A', 'B', 1]])
    // C is unreachable from A (only A and B are connected).
    disconnected.nodes.push({ id: 'Z', x: 0, y: 0 })
    disconnected.adj.Z = []
    const steps = runDijkstra(disconnected)
    expect(lastState(steps).badges.Z).toBe('∞')
  })
})

describe("Kruskal's MST", () => {
  it('produces a spanning tree with exactly n-1 edges for a connected graph', () => {
    const steps = runKruskal(STANDARD_GRAPH)
    const mstEdges = lastState(steps).order
    expect(mstEdges).toHaveLength(STANDARD_GRAPH.nodes.length - 1)
  })

  it('picks the minimum-weight spanning tree (total weight matches hand computation)', () => {
    // Sorted by weight: B-C(1), C-D(1), A-B(2), D-E(2), B-D(4) skipped (cycle),
    // A-C(5) skipped, C-E(7) skipped. MST weight = 1+1+2+2 = 6.
    const steps = runKruskal(STANDARD_GRAPH)
    const mstEdgeIds = lastState(steps).order // e.g. "B-C"
    const weightById = new Map(STANDARD_GRAPH.edges.map(e => [`${e.from}-${e.to}`, e.w]))
    const totalWeight = mstEdgeIds.reduce((sum, id) => sum + (weightById.get(id) ?? 0), 0)
    expect(totalWeight).toBe(6)
  })
})

describe('Bellman-Ford', () => {
  it('handles a negative edge correctly (matches hand computation)', () => {
    // Same shape as STANDARD_GRAPH but B->C is -4 instead of 1. No cycle is
    // possible (still a DAG), so this must converge to exact shortest paths:
    // A=0, B=2, C=-2 (via B), D=-1 (via C), E=1 (via D).
    const g = buildGraph([
      ['A', 'B', 2], ['A', 'C', 5], ['B', 'C', -4], ['B', 'D', 4], ['C', 'D', 1], ['C', 'E', 7], ['D', 'E', 2],
    ])
    const steps = runBellmanFord(g)
    const last = steps[steps.length - 1]
    expect(last.state.badges).toEqual({ A: '0', B: '2', C: '-2', D: '-1', E: '1' })
    expect(last.state.done).toBe(true)
  })

  it('detects a negative cycle when one exists', () => {
    // A->B->C->A, all negative — a genuine negative cycle.
    const g = buildGraph([['A', 'B', -1], ['B', 'C', -1], ['C', 'A', -1]])
    const steps = runBellmanFord(g)
    const last = steps[steps.length - 1]
    expect(last.note).toMatch(/negative cycle/)
    expect(last.state.done).toBe(true)
  })

  it('agrees with Dijkstra when there are no negative edges', () => {
    const dijkstraFinal = lastState(runDijkstra(STANDARD_GRAPH))
    const bellmanFinal = lastState(runBellmanFord(STANDARD_GRAPH))
    expect(bellmanFinal.badges).toEqual(dijkstraFinal.badges)
  })
})
