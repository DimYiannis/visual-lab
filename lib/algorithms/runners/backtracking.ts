import type { AlgoStep } from '../types'
import { emptyState } from '../types'

/* ---------------------------------------------------------------------------
 * N-Queens — backtracking.
 * ------------------------------------------------------------------------ */

export function pickQueensN(): number {
  const opts = [5, 6, 7]
  return opts[Math.floor(Math.random() * opts.length)]
}

export function runNQueens(n: number): AlgoStep[] {
  const steps: AlgoStep[] = []
  const board: number[] = Array(n).fill(-1)
  let col: number | null = null
  let tryRow: number | null = null
  let conflict: [number, number] | null = null
  let opsA = 0 // safety checks
  let opsB = 0 // placements

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
        opsA,
        opsB,
        done,
      },
    })
  }

  const isSafe = (row: number, c: number): [boolean, [number, number] | null] => {
    opsA += 1
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
      opsB += 1
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
