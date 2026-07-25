import type { AlgoStep } from '../types'
import { emptyState } from '../types'

export function runBubble(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  const locked: number[] = []
  let compare: number[] = []
  let opsA = 0 // comparisons
  let opsB = 0 // swaps

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: { ...emptyState(), array: [...a], compare: [...compare], locked: [...locked], opsA, opsB, done },
    })
  }

  push(2, `n = ${n} values, unsorted.`)
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    for (let j = 0; j < n - 1 - i; j++) {
      compare = [j, j + 1]
      opsA += 1
      push(6, `Compare a[${j}] = ${a[j]} and a[${j + 1}] = ${a[j + 1]}.`)
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        swapped = true
        opsB += 1
        push(7, `${a[j + 1]} > ${a[j]} — swap them.`)
      }
    }
    compare = []
    locked.push(n - 1 - i)
    push(3, `Pass ${i + 1} done: ${a[n - 1 - i]} bubbled into its final slot.`)
    if (!swapped) {
      for (let k = 0; k < n; k++) if (!locked.includes(k)) locked.push(k)
      push(10, 'A full pass with zero swaps — everything is already sorted.')
      break
    }
  }
  for (let k = 0; k < n; k++) if (!locked.includes(k)) locked.push(k)
  push(11, 'Sorted.', true)
  return steps
}

export function runInsertion(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  let compare: number[] = []
  let cursors: Record<string, number> = {}
  let sortedUpto = 0 // prefix [0..sortedUpto] is sorted-so-far
  let opsA = 0 // comparisons
  let opsB = 0 // shifts

  const push = (line: number, note: string, done = false) => {
    const locked = done
      ? a.map((_, k) => k)
      : Array.from({ length: sortedUpto + 1 }, (_, k) => k)
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: [...compare],
        locked,
        cursors: { ...cursors },
        opsA,
        opsB,
        done,
      },
    })
  }

  push(1, `The first value alone is a sorted prefix of length 1.`)
  for (let i = 1; i < n; i++) {
    const key = a[i]
    cursors = { i, j: i - 1 }
    compare = [i]
    push(3, `Pull out key = ${key}.`)
    let j = i - 1
    while (j >= 0 && a[j] > key) {
      compare = [j]
      opsA += 1
      push(6, `a[${j}] = ${a[j]} > ${key} — it must move right.`)
      a[j + 1] = a[j]
      j -= 1
      opsB += 1
      cursors = { i, j }
      push(7, `Shift ${a[j + 2]} into slot ${j + 2}.`)
    }
    opsA += 1 // the failing comparison that stopped the loop (or j < 0)
    a[j + 1] = key
    compare = [j + 1]
    sortedUpto = i
    push(9, `Drop ${key} into slot ${j + 1} — prefix of ${i + 1} is sorted.`)
  }
  compare = []
  cursors = {}
  push(10, 'Sorted.', true)
  return steps
}

export function runQuicksort(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  const locked: number[] = []
  let compare: number[] = []
  let cursors: Record<string, number> = {}
  let winLo = 0
  let winHi = n - 1
  let opsA = 0 // comparisons
  let opsB = 0 // swaps

  const push = (line: number, note: string, done = false) => {
    // Ghost everything outside the active partition window (except settled
    // pivots) so the eye follows the recursion.
    const discarded = done
      ? []
      : a.map((_, k) => k).filter(k => (k < winLo || k > winHi) && !locked.includes(k))
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: [...compare],
        locked: done ? a.map((_, k) => k) : [...locked],
        discarded,
        cursors: { ...cursors },
        opsA,
        opsB,
        done,
      },
    })
  }

  const sort = (lo: number, hi: number, depth: number) => {
    if (lo > hi) return
    winLo = lo
    winHi = hi
    if (lo === hi) {
      locked.push(lo)
      cursors = { lo, hi }
      compare = []
      push(5, `a[${lo}] = ${a[lo]} is alone in its window — already in place.`)
      return
    }
    const pivot = a[hi]
    cursors = { lo, hi, p: hi }
    compare = [hi]
    push(7, `Window [${lo}..${hi}] (depth ${depth}): pivot = a[${hi}] = ${pivot}.`)
    let i = lo
    cursors = { lo, hi, p: hi, i }
    compare = []
    push(8, `i = ${lo} marks where the next small value will land.`)
    for (let j = lo; j < hi; j++) {
      cursors = { lo, hi, p: hi, i, j }
      compare = [j]
      opsA += 1
      push(10, `a[${j}] = ${a[j]} vs pivot ${pivot}.`)
      if (a[j] < pivot) {
        const moved = a[j]
        ;[a[i], a[j]] = [a[j], a[i]]
        opsB += 1
        push(
          11,
          i === j
            ? `${moved} is already inside the small zone.`
            : `${moved} joins the small zone: swap a[${i}] ↔ a[${j}].`,
        )
        i += 1
        cursors = { lo, hi, p: hi, i, j }
      }
    }
    ;[a[i], a[hi]] = [a[hi], a[i]]
    opsB += 1
    locked.push(i)
    compare = []
    cursors = { lo, hi, i }
    push(13, `Pivot ${a[i]} drops into slot ${i} — its final position, forever.`)
    sort(lo, i - 1, depth + 1)
    sort(i + 1, hi, depth + 1)
  }

  sort(0, n - 1, 0)
  winLo = 0
  winHi = n - 1
  compare = []
  cursors = {}
  push(17, 'Sorted — every pivot locked in one partition sweep.', true)
  return steps
}

export function runMergesort(input: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a = [...input]
  const n = a.length
  let compare: number[] = []
  let cursors: Record<string, number> = {}
  let winLo = 0
  let winHi = n - 1
  let opsA = 0 // comparisons
  let opsB = 0 // writes

  const push = (line: number, note: string, done = false) => {
    const discarded = done ? [] : a.map((_, k) => k).filter(k => k < winLo || k > winHi)
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        compare: [...compare],
        locked: done ? a.map((_, k) => k) : [],
        discarded,
        cursors: { ...cursors },
        opsA,
        opsB,
        done,
      },
    })
  }

  const sort = (lo: number, hi: number, depth: number) => {
    winLo = lo
    winHi = hi
    if (lo >= hi) {
      cursors = { lo, hi }
      compare = [lo]
      push(5, `a[${lo}] = ${a[lo]} alone — trivially sorted.`)
      compare = []
      return
    }
    const mid = Math.floor((lo + hi) / 2)
    cursors = { lo, mid, hi }
    compare = []
    push(7, `Split [${lo}..${hi}] at mid = ${mid} (depth ${depth}).`)
    push(8, `Recurse into the left half [${lo}..${mid}].`)
    sort(lo, mid, depth + 1)
    winLo = lo
    winHi = hi
    cursors = { lo, mid, hi }
    push(9, `Left half sorted. Now the right half [${mid + 1}..${hi}].`)
    sort(mid + 1, hi, depth + 1)
    winLo = lo
    winHi = hi
    cursors = { lo, mid, hi }

    const left = a.slice(lo, mid + 1)
    const right = a.slice(mid + 1, hi + 1)
    push(12, `Both halves sorted: left [${left.join(', ')}], right [${right.join(', ')}]. Zip them.`)
    let i = 0
    let j = 0
    let k = lo
    while (i < left.length && j < right.length) {
      compare = [k]
      cursors = { lo, hi, k }
      opsA += 1
      push(17, `Smaller front: left offers ${left[i]}, right offers ${right[j]}.`)
      if (left[i] <= right[j]) {
        a[k] = left[i]
        i += 1
        opsB += 1
        push(18, `Take ${a[k]} from the left half → slot ${k}.`)
      } else {
        a[k] = right[j]
        j += 1
        opsB += 1
        push(20, `Take ${a[k]} from the right half → slot ${k}.`)
      }
      k += 1
    }
    const fromLeft = i < left.length
    const rest = fromLeft ? left.slice(i) : right.slice(j)
    if (rest.length) {
      for (let m = 0; m < rest.length; m++) a[k + m] = rest[m]
      opsB += rest.length
      compare = []
      cursors = { lo, hi, k }
      push(22, `${fromLeft ? 'Left' : 'Right'} half's leftovers slide in: [${rest.join(', ')}].`)
    }
    compare = []
  }

  sort(0, n - 1, 0)
  compare = []
  cursors = {}
  push(23, 'Sorted — log n levels of splitting, one linear merge per level.', true)
  return steps
}
