import { describe, it, expect } from 'vitest'
import { runNQueens } from '../../lib/algorithms/runners/backtracking'

function isValidSolution(board: number[]): boolean {
  const n = board.length
  if (board.some(row => row === -1)) return false
  for (let c1 = 0; c1 < n; c1++) {
    for (let c2 = c1 + 1; c2 < n; c2++) {
      const r1 = board[c1]
      const r2 = board[c2]
      if (r1 === r2) return false // same row
      if (Math.abs(r1 - r2) === Math.abs(c1 - c2)) return false // same diagonal
    }
  }
  return true
}

describe('N-Queens backtracking', () => {
  it.each([5, 6, 7])('produces a valid solution for n=%i (the sizes the app actually generates)', (n) => {
    const steps = runNQueens(n)
    const last = steps[steps.length - 1]
    expect(last.state.done).toBe(true)
    expect(isValidSolution(last.state.queensBoard)).toBe(true)
    expect(last.state.queensBoard).toHaveLength(n)
  })

  it('actually backtracks at least once for n=6 (undo events happen, not just clean placement)', () => {
    // n=6 is the classic case with the fewest solutions relative to search
    // space among small n; if this ever stops producing an "undo" step,
    // the backtracking logic itself has regressed, not just the demo data.
    const steps = runNQueens(6)
    const hasUndo = steps.some(s => s.note.includes('undo'))
    expect(hasUndo).toBe(true)
  })

  it('op counters accumulate monotonically and placements reach at least n (final solution needs n)', () => {
    const n = 6
    const steps = runNQueens(n)
    const last = steps[steps.length - 1]
    expect(last.state.opsA).toBeGreaterThan(0) // safety checks happened
    expect(last.state.opsB).toBeGreaterThanOrEqual(n) // at least n successful placements (some get undone and redone)
    let prevA = 0
    let prevB = 0
    for (const step of steps) {
      expect(step.state.opsA).toBeGreaterThanOrEqual(prevA)
      expect(step.state.opsB).toBeGreaterThanOrEqual(prevB)
      prevA = step.state.opsA
      prevB = step.state.opsB
    }
  })
})
