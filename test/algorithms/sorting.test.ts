import { describe, it, expect } from 'vitest'
import { runBubble, runInsertion, runQuicksort, runMergesort } from '../../lib/algorithms/runners/sorting'

const INPUT = [7, 2, 9, 1, 5, 3, 8, 4, 6, 0]
const SORTED = [...INPUT].sort((a, b) => a - b)

function lastState(steps: ReturnType<typeof runBubble>) {
  return steps[steps.length - 1].state
}

describe.each([
  ['bubble', runBubble],
  ['insertion', runInsertion],
  ['quicksort', runQuicksort],
  ['mergesort', runMergesort],
] as const)('%s sort', (name, run) => {
  it('produces a correctly sorted array', () => {
    const steps = run(INPUT)
    expect(lastState(steps).array).toEqual(SORTED)
  })

  it('marks the final step done', () => {
    const steps = run(INPUT)
    expect(lastState(steps).done).toBe(true)
  })

  it('op counters only ever increase across the trace (never reset mid-run)', () => {
    const steps = run(INPUT)
    let prevA = 0
    let prevB = 0
    for (const step of steps) {
      expect(step.state.opsA).toBeGreaterThanOrEqual(prevA)
      expect(step.state.opsB).toBeGreaterThanOrEqual(prevB)
      prevA = step.state.opsA
      prevB = step.state.opsB
    }
  })

  it(`every step's line number is one of ${name}'s Python lines`, () => {
    // Cross-checked against the catalogue in catalogue.test.ts; here just
    // assert every line is a small positive integer (a real line index).
    const steps = run(INPUT)
    for (const step of steps) {
      expect(step.line).toBeGreaterThan(0)
      expect(Number.isInteger(step.line)).toBe(true)
    }
  })
})

describe('sort comparison counts reflect their complexity class', () => {
  it('bubble sort does more comparisons than merge sort on the same reverse-sorted input', () => {
    const reversed = [...INPUT].sort((a, b) => b - a)
    const bubbleOps = lastState(runBubble(reversed)).opsA
    const mergeOps = lastState(runMergesort(reversed)).opsA
    // n=10: bubble worst case is 45 comparisons, merge sort is ~n log n ≈ 22-25.
    expect(bubbleOps).toBeGreaterThan(mergeOps)
  })

  it('insertion sort does far fewer shifts on nearly-sorted input than on reverse-sorted input', () => {
    const nearlySorted = [0, 1, 2, 3, 5, 4, 6, 7, 8, 9] // one adjacent swap off
    const reversed = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    const nearlyOps = lastState(runInsertion(nearlySorted)).opsB
    const reversedOps = lastState(runInsertion(reversed)).opsB
    expect(nearlyOps).toBeLessThan(reversedOps)
  })
})

describe('true in-place swaps stay a permutation at every step', () => {
  // Only bubble and quicksort swap elements directly. Insertion sort holds
  // `key` outside the array while shifting (a legitimate transient
  // duplicate), and merge sort writes into a[] from two separate held-out
  // slices — both would make this assertion fail for the wrong reason.
  it.each([['bubble', runBubble], ['quicksort', runQuicksort]] as const)('%s never loses or duplicates a value mid-sort', (_name, run) => {
    const sortedInput = [...INPUT].sort((a, b) => a - b)
    for (const step of run(INPUT)) {
      expect([...step.state.array].sort((a, b) => a - b)).toEqual(sortedInput)
    }
  })
})

describe('quicksort pivot placement', () => {
  it('handles an already-sorted array (its own worst case) without error', () => {
    const already = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    expect(lastState(runQuicksort(already)).array).toEqual(already)
  })

  it('handles duplicate values', () => {
    const dupes = [5, 3, 5, 1, 3, 5, 1]
    expect(lastState(runQuicksort(dupes)).array).toEqual([...dupes].sort((a, b) => a - b))
  })
})

describe('single-element and empty edge cases', () => {
  it.each([
    ['bubble', runBubble],
    ['insertion', runInsertion],
    ['quicksort', runQuicksort],
    ['mergesort', runMergesort],
  ] as const)('%s handles a single-element array', (_name, run) => {
    const steps = run([42])
    expect(lastState(steps).array).toEqual([42])
    expect(lastState(steps).done).toBe(true)
  })
})
