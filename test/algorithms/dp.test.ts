import { describe, it, expect } from 'vitest'
import { runKnapsack } from '../../lib/algorithms/runners/dp'

/** Brute force over all 2^n subsets — feasible for the small n the DP demo uses, and independent of the DP implementation, so this is a real correctness check, not a tautology. */
function bruteForceOptimal(weights: number[], values: number[], cap: number): number {
  const n = weights.length
  let best = 0
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0
    let v = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        w += weights[i]
        v += values[i]
      }
    }
    if (w <= cap) best = Math.max(best, v)
  }
  return best
}

describe('0/1 knapsack DP', () => {
  it('matches brute-force optimal value across several random instances', () => {
    for (let trial = 0; trial < 20; trial++) {
      const weights = Array.from({ length: 5 }, () => 2 + Math.floor(Math.random() * 6))
      const values = Array.from({ length: 5 }, () => 4 + Math.floor(Math.random() * 19))
      const cap = 10 + Math.floor(Math.random() * 5)

      const steps = runKnapsack({ weights, values, cap })
      const last = steps[steps.length - 1]
      const dpOptimal = last.state.gridValues[weights.length][cap]
      expect(dpOptimal).toBe(bruteForceOptimal(weights, values, cap))
    }
  })

  it('the backtraced chosen items actually sum to the optimal value and fit capacity', () => {
    const weights = [3, 4, 5, 2, 6]
    const values = [10, 12, 15, 6, 18]
    const cap = 12
    const steps = runKnapsack({ weights, values, cap })
    const last = steps[steps.length - 1]

    const chosenIndices = last.state.order.map(label => Number(label.replace('item ', '')) - 1)
    const totalWeight = chosenIndices.reduce((sum, i) => sum + weights[i], 0)
    const totalValue = chosenIndices.reduce((sum, i) => sum + values[i], 0)

    expect(totalWeight).toBeLessThanOrEqual(cap)
    expect(totalValue).toBe(last.state.gridValues[weights.length][cap])
    expect(totalValue).toBe(bruteForceOptimal(weights, values, cap))
  })

  it('never re-solves a subproblem: exactly (n+1)*(cap+1) cells get filled', () => {
    const weights = [3, 4, 5, 2, 6]
    const values = [10, 12, 15, 6, 18]
    const cap = 12
    const steps = runKnapsack({ weights, values, cap })
    const last = steps[steps.length - 1]
    // opsA counts cell fills in the main DP loop (row 0 is free/base case).
    expect(last.state.opsA).toBe(weights.length * (cap + 1))
  })
})
