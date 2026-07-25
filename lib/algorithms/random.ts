/** Shared randomness helpers for input generation across every runner category. */

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function randomValues(n: number): number[] {
  const vals = new Set<number>()
  while (vals.size < n) vals.add(8 + Math.floor(Math.random() * 91))
  return shuffle([...vals])
}

export function pickTarget(sorted: number[]): number {
  // Mostly present (find it), sometimes absent (watch the -1 path).
  if (Math.random() < 0.75) return sorted[Math.floor(Math.random() * sorted.length)]
  let t = 8 + Math.floor(Math.random() * 91)
  while (sorted.includes(t)) t++
  return t
}

export function randomInRange(n: number, min: number, max: number): number[] {
  const vals = new Set<number>()
  while (vals.size < n) vals.add(min + Math.floor(Math.random() * (max - min + 1)))
  return shuffle([...vals])
}
