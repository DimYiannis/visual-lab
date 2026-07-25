import type { AlgoStep } from '../types'
import { emptyState } from '../types'
import { randomInRange } from '../random'

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

export function runKnapsack({ weights, values, cap }: KnapsackInput): AlgoStep[] {
  const steps: AlgoStep[] = []
  const n = weights.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(-1))
  const rowLabels = ['∅', ...weights.map((w, i) => `w${i + 1}=${w}, v=${values[i]}`)]
  const colLabels = Array.from({ length: cap + 1 }, (_, c) => String(c))
  let active: [number, number] | null = null
  let source: Array<[number, number]> = []
  let path: Array<[number, number]> = []
  const chosen: string[] = []
  let opsA = 0 // cells filled
  let opsB = 0 // backtrack steps

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
        opsA,
        opsB,
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
      opsA += 1
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
    opsB += 1
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
