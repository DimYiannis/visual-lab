import { describe, it, expect } from 'vitest'
import {
  runPhilosophers,
  runProducerConsumer,
  runReadersWriters,
  runLostUpdateCounter,
  runStarvation,
} from '../../stores/concurrency'

function last<T extends { state: unknown }>(steps: T[]) {
  return steps[steps.length - 1]
}

describe('Dining Philosophers — deadlock (circular wait)', () => {
  it('naive (symmetric fork order) deadlocks every run', () => {
    const steps = runPhilosophers('naive')
    const final = last(steps).state
    expect(final.deadlocked).toBe(true)
    expect(final.done).toBe(true)
    // No one ever got to eat — that's the whole point of this deadlock.
    expect(final.phils.every(p => p.meals === 0)).toBe(true)
  })

  it('fixed (asymmetric fork order) never deadlocks and everyone eats', () => {
    const steps = runPhilosophers('fixed')
    const final = last(steps).state
    expect(final.deadlocked).toBe(false)
    expect(final.done).toBe(true)
    expect(final.phils.every(p => p.phase === 'satisfied')).toBe(true)
    expect(final.phils.every(p => p.meals >= 2)).toBe(true)
  })

  it('every "eating" philosopher genuinely holds both of their forks (never fewer)', () => {
    // A philosopher holding just one fork can only be 'holding1', not
    // 'eating' — this is the actual mutual-exclusion invariant. (A single
    // philosopher legitimately holds two fork slots while eating, so
    // asserting fork *values* are all unique — as an earlier version of
    // this test did — is wrong: that's the normal, correct case.)
    for (const variant of ['naive', 'fixed'] as const) {
      for (const step of runPhilosophers(variant)) {
        for (let i = 0; i < step.state.phils.length; i++) {
          if (step.state.phils[i].phase === 'eating') {
            const heldByI = step.state.forks.filter(f => f === i).length
            expect(heldByI).toBe(2)
          }
        }
      }
    }
  })
})

describe('Producer-Consumer — backpressure', () => {
  it('naive (no capacity check) overflows the bounded buffer', () => {
    const steps = runProducerConsumer('naive')
    const final = last(steps).state
    expect(final.overflowed).toBe(true)
    expect(final.buffer.length).toBeGreaterThan(final.bufCap)
  })

  it('fixed (producer blocks when full) never exceeds capacity at any point', () => {
    const steps = runProducerConsumer('fixed')
    for (const step of steps) {
      expect(step.state.buffer.length).toBeLessThanOrEqual(step.state.bufCap)
    }
    const final = last(steps).state
    expect(final.overflowed).toBe(false)
    expect(final.producers.every(p => p.done)).toBe(true)
    expect(final.consumed).toBe(final.totalItems)
  })
})

describe('Readers-Writers — mutual exclusion', () => {
  it('naive (no lock) produces a torn read (an odd value where the invariant demands even)', () => {
    const steps = runReadersWriters('naive')
    const final = last(steps).state
    expect(final.rwCorrupted).toBe(true)
  })

  it('fixed (reader takes the lock too) never observes an odd value', () => {
    const steps = runReadersWriters('fixed')
    for (const step of steps) {
      expect(step.state.rwValue % 2).toBe(0)
    }
    const final = last(steps).state
    expect(final.rwCorrupted).toBe(false)
    expect(final.done).toBe(true)
  })
})

describe('Lost-Update Counter — silent race vs atomic increment', () => {
  it('naive (unsynchronized read-modify-write) loses updates despite both threads reporting success', () => {
    const steps = runLostUpdateCounter('naive')
    const final = last(steps).state
    expect(final.counterLost).toBeGreaterThan(0)
    expect(final.counterValue).toBeLessThan(final.counterExpected)
    // Both threads still believe they completed every increment — the bug
    // is invisible from either thread's own point of view.
    expect(final.counterThreads.every(t => t.done === t.target)).toBe(true)
  })

  it('fixed (atomic increment) loses nothing — final value matches expected exactly', () => {
    const steps = runLostUpdateCounter('fixed')
    const final = last(steps).state
    expect(final.counterLost).toBe(0)
    expect(final.counterValue).toBe(final.counterExpected)
  })
})

describe('Priority Scheduling — starvation vs aging', () => {
  it('naive (strict priority) starves the low-priority thread completely', () => {
    const steps = runStarvation('naive')
    const final = last(steps).state
    const low = final.schedThreads.find(t => t.id === 'LOW')!
    expect(low.done).toBe(0)
  })

  it('fixed (aging) guarantees the low-priority thread eventually completes, while high still dominates', () => {
    const steps = runStarvation('fixed')
    const final = last(steps).state
    const low = final.schedThreads.find(t => t.id === 'LOW')!
    const high = final.schedThreads.find(t => t.id === 'HIGH')!
    expect(low.done).toBeGreaterThanOrEqual(low.target)
    expect(high.done).toBeGreaterThan(low.done) // priority still matters
  })
})

describe('every scenario runner terminates and narrates every step', () => {
  const runners = [
    ['philosophers-naive', () => runPhilosophers('naive')],
    ['philosophers-fixed', () => runPhilosophers('fixed')],
    ['producer-consumer-naive', () => runProducerConsumer('naive')],
    ['producer-consumer-fixed', () => runProducerConsumer('fixed')],
    ['readers-writers-naive', () => runReadersWriters('naive')],
    ['readers-writers-fixed', () => runReadersWriters('fixed')],
    ['counter-naive', () => runLostUpdateCounter('naive')],
    ['counter-fixed', () => runLostUpdateCounter('fixed')],
    ['starvation-naive', () => runStarvation('naive')],
    ['starvation-fixed', () => runStarvation('fixed')],
  ] as const

  it.each(runners)('%s produces a finite, fully-narrated, done trace', (_name, run) => {
    const steps = run()
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.length).toBeLessThan(2000) // sanity cap — no runaway scheduler
    expect(last(steps).state.done).toBe(true)
    for (const step of steps) {
      expect(step.note.length).toBeGreaterThan(0)
      expect(step.line).toBeGreaterThanOrEqual(1)
    }
  })
})
