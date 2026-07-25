import type { AlgoStep } from '../types'
import { emptyState } from '../types'
import type { Graph } from '../graph'

/* ---------------------------------------------------------------------------
 * Runners — TypeScript twins of the displayed Python. Line numbers in the
 * push() calls refer to the code arrays in ../catalogue.ts.
 * ------------------------------------------------------------------------ */

export function runKahn(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const indeg: Record<string, number> = Object.fromEntries(g.nodes.map(n => [n.id, 0]))
  const queue: string[] = []
  const order: string[] = []
  const cut: string[] = []
  let current: string | null = null
  let active: string | null = null
  let opsA = 0 // edges processed
  let opsB = 0 // nodes dequeued

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
        opsA,
        opsB,
        done,
      },
    })
  }

  push(5, 'Every node starts at in-degree 0.')
  for (const e of g.edges) {
    active = e.id
    indeg[e.to] += 1
    opsA += 1
    push(7, `${e.from}→${e.to} raises indeg[${e.to}] to ${indeg[e.to]}.`)
  }
  active = null

  for (const n of g.nodes) if (indeg[n.id] === 0) queue.push(n.id)
  push(11, `Nothing points at ${queue.join(', ')} — they seed the queue.`)
  push(13, 'The order starts empty.')

  while (queue.length) {
    current = queue.shift()!
    opsB += 1
    push(17, `Pop ${current}: its last incoming edge is long gone.`)
    order.push(current)
    push(18, `${current} is safe to schedule next.`)
    for (const e of g.adj[current]) {
      active = e.id
      indeg[e.to] -= 1
      opsA += 1
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

export function runBFS(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const seen = new Set<string>([g.start])
  const queue: string[] = [g.start]
  const order: string[] = []
  const tree: string[] = []
  let current: string | null = null
  let active: string | null = null
  let opsA = 0 // edges checked
  let opsB = 0 // nodes visited

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
        opsA,
        opsB,
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
    opsB += 1
    push(10, `Visit ${current}.`)
    for (const e of g.adj[current]) {
      active = e.id
      opsA += 1
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

export function runDFS(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const seen = new Set<string>([g.start])
  const order: string[] = []
  const stack: string[] = []
  const tree: string[] = []
  let active: string | null = null
  let opsA = 0 // edges checked
  let opsB = 0 // nodes visited

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
        opsA,
        opsB,
        done,
      },
    })
  }

  push(2, `Start at ${g.start}: mark it seen.`)
  push(3, 'Visit order starts empty.')

  const visit = (u: string) => {
    stack.push(u)
    order.push(u)
    opsB += 1
    push(6, `Visit ${u}${stack.length > 1 ? ` (depth ${stack.length})` : ''}.`)
    for (const e of g.adj[u]) {
      active = e.id
      opsA += 1
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

export function runDijkstra(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const INF = Number.POSITIVE_INFINITY
  const dist: Record<string, number> = Object.fromEntries(g.nodes.map(n => [n.id, INF]))
  const parent: Record<string, string> = {}
  const pq: Array<[number, string]> = []
  const settled: string[] = []
  let current: string | null = null
  let active: string | null = null
  let opsA = 0 // relaxation attempts
  let opsB = 0 // pops

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
        opsA,
        opsB,
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
    opsB += 1
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
      opsA += 1
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

export function runKruskal(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const parent: Record<string, string> = Object.fromEntries(g.nodes.map(n => [n.id, n.id]))
  const mstEdges: string[] = []
  const remaining = [...g.edges].sort((a, b) => a.w - b.w || a.id.localeCompare(b.id))
  const tree: string[] = []
  const cut: string[] = []
  let active: string | null = null
  let opsA = 0 // find calls
  let opsB = 0 // MST edges

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
        opsA,
        opsB,
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
    opsA += 2
    push(13, `find(${e.from}) = ${ra}, find(${e.to}) = ${rb} — path-halved along the way.`)
    if (ra === rb) {
      cut.push(e.id)
      push(15, `Same island already — adding this edge would close a cycle. Skip.`)
    } else {
      parent[ra] = rb
      tree.push(e.id)
      mstEdges.push(`${e.from}-${e.to}`)
      opsB += 1
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

export function runBellmanFord(g: Graph): AlgoStep[] {
  const steps: AlgoStep[] = []
  const INF = Number.POSITIVE_INFINITY
  const dist: Record<string, number> = Object.fromEntries(g.nodes.map(n => [n.id, INF]))
  const rounds: string[] = []
  let active: string | null = null
  let remaining: string[] = []
  let opsA = 0 // edge checks
  let opsB = 0 // relaxations

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
        opsA,
        opsB,
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
      opsA += 1
      const nd = dist[e.from] + e.w
      if (dist[e.from] !== INF && nd < dist[e.to]) {
        dist[e.to] = nd
        updated = true
        opsB += 1
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
    opsA += 1
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
