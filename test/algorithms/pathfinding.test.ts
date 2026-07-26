import { describe, it, expect } from 'vitest'
import { runAStar, type MazeInput } from '../../lib/algorithms/runners/pathfinding'

function lastState(steps: ReturnType<typeof runAStar>) {
  return steps[steps.length - 1].state
}

describe('A* pathfinding', () => {
  it('finds the shortest path on an open 3x3 grid (corner to corner = 4 moves)', () => {
    const maze: MazeInput = { w: 3, h: 3, walls: [], start: 0, goal: 8 }
    const steps = runAStar(maze)
    const last = lastState(steps)
    expect(last.done).toBe(true)
    expect(last.mazePath[0]).toBe(0)
    expect(last.mazePath[last.mazePath.length - 1]).toBe(8)
    expect(last.mazePath.length - 1).toBe(4) // Manhattan distance from (0,0) to (2,2)
  })

  it('the returned path is contiguous (each step moves to an orthogonal neighbor)', () => {
    const maze: MazeInput = { w: 3, h: 3, walls: [], start: 0, goal: 8 }
    const path = lastState(runAStar(maze)).mazePath
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]
      const b = path[i]
      const dr = Math.abs(Math.floor(a / 3) - Math.floor(b / 3))
      const dc = Math.abs((a % 3) - (b % 3))
      expect(dr + dc).toBe(1) // exactly one orthogonal step
    }
  })

  it('the path never crosses a wall', () => {
    // 3x3 grid, wall down the middle column except the bottom cell — forces
    // a detour around it.
    const maze: MazeInput = { w: 3, h: 3, walls: [1, 4], start: 0, goal: 8 }
    const path = lastState(runAStar(maze)).mazePath
    for (const cell of path) {
      expect(maze.walls).not.toContain(cell)
    }
  })

  it('reports failure when the goal is walled off entirely', () => {
    // Goal (8) surrounded on both approaches (5 and 7) — unreachable.
    const maze: MazeInput = { w: 3, h: 3, walls: [5, 7], start: 0, goal: 8 }
    const steps = runAStar(maze)
    const last = lastState(steps)
    expect(last.done).toBe(true)
    expect(last.mazePath).toHaveLength(0)
  })

  it('trivial case: start equals goal', () => {
    const maze: MazeInput = { w: 3, h: 3, walls: [], start: 4, goal: 4 }
    const last = lastState(runAStar(maze))
    expect(last.mazePath).toEqual([4])
  })
})
