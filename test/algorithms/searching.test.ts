import { describe, it, expect } from 'vitest'
import { runBinarySearch } from '../../lib/algorithms/runners/searching'

const SORTED = [8, 15, 23, 31, 42, 50, 61, 70, 82, 91, 95, 99, 100]

describe('binary search', () => {
  it('finds every value actually in the array', () => {
    for (const target of SORTED) {
      const steps = runBinarySearch(SORTED, target)
      const last = steps[steps.length - 1]
      expect(last.state.foundIndex).toBe(SORTED.indexOf(target))
      expect(last.state.done).toBe(true)
    }
  })

  it('reports not-found for a value absent from the array', () => {
    const steps = runBinarySearch(SORTED, 500)
    const last = steps[steps.length - 1]
    expect(last.state.foundIndex).toBeNull()
    expect(last.note).toMatch(/not in the array/)
  })

  it('never takes more than ceil(log2(n)) + 1 probes', () => {
    const maxProbes = Math.ceil(Math.log2(SORTED.length)) + 1
    for (const target of [...SORTED, -1, 1000]) {
      const steps = runBinarySearch(SORTED, target)
      const probeCount = steps.filter(s => s.line === 5).length // "mid = ..." line
      expect(probeCount).toBeLessThanOrEqual(maxProbes)
    }
  })

  it('opsA (comparisons) matches the number of probes', () => {
    const steps = runBinarySearch(SORTED, 61)
    const last = steps[steps.length - 1]
    const probeCount = steps.filter(s => s.line === 5).length
    expect(last.state.opsA).toBe(probeCount)
  })

  it('handles a single-element array', () => {
    expect(runBinarySearch([5], 5)[0]).toBeDefined()
    const hit = runBinarySearch([5], 5)
    expect(hit[hit.length - 1].state.foundIndex).toBe(0)
    const miss = runBinarySearch([5], 9)
    expect(miss[miss.length - 1].state.foundIndex).toBeNull()
  })
})
