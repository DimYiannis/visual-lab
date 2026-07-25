import type { AlgoStep } from '../types'
import { emptyState } from '../types'

export function runBinarySearch(sorted: number[], target: number): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...sorted]
  let lo = 0
  let hi = a.length - 1
  let mid: number | null = null
  let found: number | null = null
  let opsA = 0 // comparisons (probes)

  const push = (line: number, note: string, done = false) => {
    const discarded = a.map((_, k) => k).filter(k => k < lo || k > hi)
    const cursors: Record<string, number> = { lo, hi }
    if (mid !== null) cursors.mid = mid
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: mid !== null && found === null ? [mid] : [],
        discarded,
        cursors,
        foundIndex: found,
        opsA,
        opsB: 0,
        done,
      },
    })
  }

  push(2, `Search window is the whole array: lo = 0, hi = ${hi}. Target: ${target}.`)
  while (lo <= hi) {
    mid = Math.floor((lo + hi) / 2)
    opsA += 1
    push(5, `mid = (${lo} + ${hi}) // 2 = ${mid}.`)
    if (a[mid] === target) {
      found = mid
      push(7, `a[${mid}] = ${target} — found it in ${steps.filter(s => s.line === 5).length} probes.`, true)
      return steps
    }
    if (a[mid] < target) {
      lo = mid + 1
      push(9, `a[${mid}] = ${a[mid]} < ${target}: everything left of mid is too small. lo = ${lo}.`)
    } else {
      hi = mid - 1
      push(11, `a[${mid}] = ${a[mid]} > ${target}: everything right of mid is too big. hi = ${hi}.`)
    }
    mid = null
  }
  push(4, `lo (${lo}) has crossed hi (${hi}) — the window is empty.`)
  push(13, `${target} is not in the array: return -1.`, true)
  return steps
}
