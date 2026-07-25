import { GRAPH_NODES, MAX_GRAPH_EDGES } from './types'
import { shuffle } from './random'

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

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const VIEW_W = 640
const VIEW_H = 400

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
