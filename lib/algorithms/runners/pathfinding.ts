import type { AlgoStep } from '../types'
import { emptyState } from '../types'

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

export function runAStar({ w, h, walls, start, goal }: MazeInput): AlgoStep[] {
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
