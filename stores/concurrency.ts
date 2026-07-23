import { defineStore, acceptHMRUpdate } from 'pinia'

/* ---------------------------------------------------------------------------
 * Concurrency Lab store — the third sibling (after the math workspace and
 * the Algorithm Lab). Same trace-and-scrub machinery, same shared-state
 * shape as the Algorithm Lab's StepState: one loose interface, every viz
 * kind reads its own fields and ignores the rest. There is no real
 * threading here, just a deterministic round-robin scheduler that gives
 * each thread one action per turn — which is exactly what makes a genuine
 * concurrency bug reproducible and scrubbable instead of a one-time
 * timing accident.
 * ------------------------------------------------------------------------ */

export type ConVizKind = 'philosophers' | 'buffer' | 'rwlock'

const N_PHIL = 5
const MEALS_TARGET = 2

export type PhilPhase = 'thinking' | 'hungry' | 'holding1' | 'eating' | 'satisfied'

export interface PhilState {
  phase: PhilPhase
  meals: number
}

export interface ProducerState {
  id: number
  produced: number
  target: number
  done: boolean
}

export interface ReaderState {
  id: number
  done: number
  target: number
}

/**
 * One snapshot of concurrency-simulation state, shared across every viz
 * kind — same pattern as the Algorithm Lab's StepState.
 */
export interface ConcurrencyStepState {
  // philosophers viz
  phils: PhilState[]
  /** Fork i's holder (philosopher index), or null if free. */
  forks: Array<number | null>
  activePhil: number | null
  deadlocked: boolean
  // buffer viz (producer-consumer) — item values in FIFO order
  buffer: number[]
  bufCap: number
  producers: ProducerState[]
  consumed: number
  totalItems: number
  overflowed: boolean
  activeActor: string | null
  // rwlock viz (readers-writers) — value must always be even
  rwValue: number
  rwWriterDone: number
  rwWriterTarget: number
  rwReaders: ReaderState[]
  rwCorrupted: boolean
  rwLog: string[]
  // shared
  done: boolean
}

function emptyConState(): ConcurrencyStepState {
  return {
    phils: [],
    forks: [],
    activePhil: null,
    deadlocked: false,
    buffer: [],
    bufCap: 0,
    producers: [],
    consumed: 0,
    totalItems: 0,
    overflowed: false,
    activeActor: null,
    rwValue: 0,
    rwWriterDone: 0,
    rwWriterTarget: 0,
    rwReaders: [],
    rwCorrupted: false,
    rwLog: [],
    done: false,
  }
}

export interface ConcurrencyStep {
  line: number
  note: string
  state: ConcurrencyStepState
}

export interface ConcurrencyDef {
  id: string
  label: string
  category: 'Deadlock' | 'Synchronization'
  viz: ConVizKind
  /** Repurposed complexity-badge slot: the outcome, since that's the point here. */
  outcome: string
  tagline: string
  lesson: string
  code: string
}

export const CONCURRENCY: ConcurrencyDef[] = [
  {
    id: 'philosophers-naive',
    label: 'Dining Philosophers · naive',
    category: 'Deadlock',
    viz: 'philosophers',
    outcome: 'Deadlocks — guaranteed',
    tagline: 'Symmetry is the bug',
    lesson:
      'Four things have to be true at once for a deadlock: mutual exclusion, hold-and-wait, no preemption, and circular wait. Symmetric code — every thread reaches for its forks in the same order — quietly guarantees the fourth one. The bug is not in any single acquire/release pair; it is in the shared pattern repeated across all five threads at once.',
    code: [
      'import threading',
      '',
      'class Philosopher(threading.Thread):',
      '    def __init__(self, i, left_fork, right_fork):',
      '        super().__init__()',
      '        self.i = i',
      '        self.left_fork = left_fork',
      '        self.right_fork = right_fork',
      '',
      '    def run(self):',
      '        while True:',
      '            think()',
      '            self.left_fork.acquire()   # always grab left first',
      '            self.right_fork.acquire()  # then right',
      '            eat()',
      '            self.right_fork.release()',
      '            self.left_fork.release()',
    ].join('\n'),
  },
  {
    id: 'philosophers-fixed',
    label: 'Dining Philosophers · fixed',
    category: 'Deadlock',
    viz: 'philosophers',
    outcome: 'Deadlock-free',
    tagline: 'Break the cycle, not the lock',
    lesson:
      'Break just one of the four deadlock conditions and the whole class of bug disappears. Here it is circular wait: one thread reaches for its forks in the opposite order, so the chain of who-waits-for-whom can no longer close into a loop. No lock changed, no mutex logic changed — only the order one thread asks for its resources.',
    code: [
      'import threading',
      '',
      'class Philosopher(threading.Thread):',
      '    def __init__(self, i, left_fork, right_fork):',
      '        super().__init__()',
      '        self.i = i',
      '        # break the cycle: odd philosophers reach for the right fork first',
      '        if i % 2 == 0:',
      '            self.first, self.second = left_fork, right_fork',
      '        else:',
      '            self.first, self.second = right_fork, left_fork',
      '',
      '    def run(self):',
      '        while True:',
      '            think()',
      '            self.first.acquire()',
      '            self.second.acquire()',
      '            eat()',
      '            self.second.release()',
      '            self.first.release()',
    ].join('\n'),
  },
  {
    id: 'producer-consumer-naive',
    label: 'Producer-Consumer · naive',
    category: 'Synchronization',
    viz: 'buffer',
    outcome: 'Overflows — guaranteed',
    tagline: 'Nothing is watching the size',
    lesson:
      'A bounded buffer makes a promise: never hold more than it can. Without a check, producers just write — the buffer is a suggestion, not a limit. This graph has 3 producers outrunning 1 consumer on purpose: real backpressure only shows up under exactly this kind of rate mismatch, which is the normal case in real systems (bursty writers, a slow downstream consumer), not the exception.',
    code: [
      'import threading',
      'from collections import deque',
      '',
      'buffer = deque()',
      'CAPACITY = 4',
      '',
      'class Producer(threading.Thread):',
      '    def run(self):',
      '        for item in self.items:',
      '            buffer.append(item)  # no capacity check — can overflow',
      '            print(f"produced {item}")',
      '',
      'class Consumer(threading.Thread):',
      '    def run(self):',
      '        while not done():',
      '            if buffer:',
      '                item = buffer.popleft()',
      '                print(f"consumed {item}")',
    ].join('\n'),
  },
  {
    id: 'producer-consumer-fixed',
    label: 'Producer-Consumer · fixed',
    category: 'Synchronization',
    viz: 'buffer',
    outcome: 'Bounded — never overflows',
    tagline: 'The producer waits, not the buffer',
    lesson:
      'The fix does not make writes faster or the buffer bigger — it makes the producer block when there is nowhere to put anything. That single wait is backpressure: the fast side of the system slows down to match the slow side, instead of silently losing or corrupting data. Same rate mismatch as the naive run (3 producers, 1 consumer), but the buffer never exceeds capacity and every item produced gets consumed.',
    code: [
      'import threading',
      'from collections import deque',
      '',
      'buffer = deque()',
      'CAPACITY = 4',
      'not_full = threading.Condition()',
      '',
      'class Producer(threading.Thread):',
      '    def run(self):',
      '        for item in self.items:',
      '            with not_full:',
      '                while len(buffer) >= CAPACITY:',
      '                    not_full.wait()      # block: no room yet',
      '                buffer.append(item)',
      '                not_full.notify_all()',
      '',
      'class Consumer(threading.Thread):',
      '    def run(self):',
      '        while not done():',
      '            with not_full:',
      '                if buffer:',
      '                    item = buffer.popleft()',
      '                    not_full.notify_all()  # a slot just freed up',
    ].join('\n'),
  },
  {
    id: 'readers-writers-naive',
    label: 'Readers-Writers · naive',
    category: 'Synchronization',
    viz: 'rwlock',
    outcome: 'Torn reads — guaranteed',
    tagline: 'A read caught mid-write',
    lesson:
      "A write is rarely one CPU instruction — this one is honestly two. Without a lock, a reader is free to run in the gap between them and observe a value that never should have existed: not the old state, not the new state, something in between. That is a torn read. The invariant here (\"this number is always even\") is deliberately simple so the violation is impossible to miss — real torn reads corrupt structs, pointers, and counters the same way, just less visibly.",
    code: [
      'import threading',
      '',
      'value = 0',
      '',
      'class Writer(threading.Thread):',
      '    def run(self):',
      '        for _ in range(WRITES):',
      '            global value',
      '            value += 1        # first half of the update',
      '            value += 1        # second half — a reader could land here',
      '',
      'class Reader(threading.Thread):',
      '    def run(self):',
      '        for _ in range(READS):',
      '            v = value          # no lock: might catch a mid-update value',
      '            assert v % 2 == 0  # invariant: value is always even',
    ].join('\n'),
  },
  {
    id: 'readers-writers-fixed',
    label: 'Readers-Writers · fixed',
    category: 'Synchronization',
    viz: 'rwlock',
    outcome: 'Always consistent',
    tagline: 'Readers wait for the whole write',
    lesson:
      'The reader now takes the same lock the writer does — just briefly, to look. That is enough: a reader either sees the value fully before the write or fully after, never mid-way. A real read-write lock goes further and lets many readers overlap each other for throughput (nothing they do can conflict, since none of them mutate anything) while still keeping a writer fully exclusive — but that optimization only makes sense once this correctness property already holds.',
    code: [
      'import threading',
      '',
      'value = 0',
      'lock = threading.Lock()',
      '',
      'class Writer(threading.Thread):',
      '    def run(self):',
      '        for _ in range(WRITES):',
      '            global value',
      '            with lock:',
      '                value += 1     # both halves happen with the lock held',
      '                value += 1     # no reader can observe the state between them',
      '',
      'class Reader(threading.Thread):',
      '    def run(self):',
      '        for _ in range(READS):',
      '            with lock:',
      '                v = value      # the lock guarantees value is never mid-update',
      '            assert v % 2 == 0  # always holds',
    ].join('\n'),
  },
]

function leftFork(i: number): number {
  return i
}
function rightFork(i: number, n: number): number {
  return (i + 1) % n
}

function runPhilosophers(variant: 'naive' | 'fixed'): ConcurrencyStep[] {
  const n = N_PHIL
  const forks: Array<number | null> = Array(n).fill(null)
  const phils: PhilState[] = Array.from({ length: n }, () => ({ phase: 'thinking', meals: 0 }))
  const steps: ConcurrencyStep[] = []
  let active: number | null = null
  let deadlocked = false

  const firstFork = (i: number) =>
    variant === 'naive' ? leftFork(i) : i % 2 === 0 ? leftFork(i) : rightFork(i, n)
  const secondFork = (i: number) =>
    variant === 'naive' ? rightFork(i, n) : i % 2 === 0 ? rightFork(i, n) : leftFork(i)

  const lines = variant === 'naive'
    ? { intro: 3, think: 12, first: 13, second: 14, release: 17 }
    : { intro: 3, think: 15, first: 16, second: 17, release: 20 }

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyConState(),
        phils: phils.map(p => ({ ...p })),
        forks: [...forks],
        activePhil: active,
        deadlocked,
        done,
      },
    })
  }

  push(lines.intro, `${n} philosophers, ${n} forks between them. ${
    variant === 'naive'
      ? 'Everyone reaches for the fork on their left first.'
      : 'Even philosophers reach left first, odd philosophers reach right first.'
  }`)

  const maxTicks = n * 40
  let sinceProgress = 0

  for (let tick = 0; tick < maxTicks; tick++) {
    if (phils.every(p => p.phase === 'satisfied')) break

    for (let i = 0; i < n; i++) {
      const p = phils[i]
      if (p.phase === 'satisfied') continue
      active = i
      let progressed = false

      if (p.phase === 'thinking') {
        p.phase = 'hungry'
        push(lines.think, `P${i} gets hungry.`)
        progressed = true
      } else if (p.phase === 'hungry') {
        const f = firstFork(i)
        if (forks[f] === null) {
          forks[f] = i
          p.phase = 'holding1'
          push(lines.first, `P${i} picks up fork ${f}.`)
          progressed = true
        } else {
          push(lines.first, `P${i} is blocked — fork ${f} is held by P${forks[f]}.`)
        }
      } else if (p.phase === 'holding1') {
        const f2 = secondFork(i)
        if (forks[f2] === null) {
          forks[f2] = i
          p.phase = 'eating'
          p.meals += 1
          push(lines.second, `P${i} picks up fork ${f2} and starts eating (meal ${p.meals}).`)
          progressed = true
        } else {
          push(lines.second, `P${i} is blocked — fork ${f2} is held by P${forks[f2]}.`)
        }
      } else if (p.phase === 'eating') {
        forks[firstFork(i)] = null
        forks[secondFork(i)] = null
        p.phase = p.meals >= MEALS_TARGET ? 'satisfied' : 'thinking'
        push(lines.release, p.phase === 'satisfied'
          ? `P${i} finishes eating and is satisfied (${p.meals} meals) — done for good.`
          : `P${i} finishes eating, puts down both forks, and goes back to thinking.`)
        progressed = true
      }

      active = null
      sinceProgress = progressed ? 0 : sinceProgress + 1
      if (sinceProgress >= n) {
        deadlocked = true
        push(
          lines.first,
          'Deadlock: every philosopher is holding one fork and waiting for the next — a circular wait. No one can proceed.',
          true,
        )
        return steps
      }
    }
  }

  const allDone = phils.every(p => p.phase === 'satisfied')
  push(
    lines.release,
    allDone
      ? `All ${n} philosophers ate ${MEALS_TARGET} meals each with zero deadlocks.`
      : 'Simulation ended without every philosopher finishing (safety cap reached).',
    true,
  )
  return steps
}

/* ---------------------------------------------------------------------------
 * Producer-Consumer — bounded buffer, 3 producers outrunning 1 consumer.
 * ------------------------------------------------------------------------ */

const BUF_CAP = 4
const N_PRODUCERS = 3
const ITEMS_PER_PRODUCER = 3
const TOTAL_ITEMS = N_PRODUCERS * ITEMS_PER_PRODUCER

function runProducerConsumer(variant: 'naive' | 'fixed'): ConcurrencyStep[] {
  const steps: ConcurrencyStep[] = []
  const buffer: number[] = []
  const producers: ProducerState[] = Array.from({ length: N_PRODUCERS }, (_, id) => ({
    id, produced: 0, target: ITEMS_PER_PRODUCER, done: false,
  }))
  let consumed = 0
  let nextItem = 1
  let overflowed = false
  let active: string | null = null

  const lines = variant === 'naive'
    ? { intro: 5, blocked: 10, produce: 10, consumeCheck: 16, consumeOk: 17 }
    : { intro: 6, blocked: 13, produce: 14, consumeCheck: 21, consumeOk: 22 }

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyConState(),
        buffer: [...buffer],
        bufCap: BUF_CAP,
        producers: producers.map(p => ({ ...p })),
        consumed,
        totalItems: TOTAL_ITEMS,
        overflowed,
        activeActor: active,
        done,
      },
    })
  }

  push(lines.intro, `Capacity ${BUF_CAP}. 3 producers writing, 1 consumer reading — production can outrun consumption.`)

  const maxTicks = 60
  for (let tick = 0; tick < maxTicks; tick++) {
    if (producers.every(p => p.done) && consumed >= TOTAL_ITEMS) break

    for (const p of producers) {
      if (p.done) continue
      active = `P${p.id}`

      if (variant === 'naive') {
        const item = nextItem++
        buffer.push(item)
        p.produced += 1
        push(lines.produce, `P${p.id} writes item ${item} — buffer now holds ${buffer.length}.`)
        if (buffer.length > BUF_CAP) {
          overflowed = true
          push(lines.produce, `Buffer overflow! Capacity is ${BUF_CAP} but it holds ${buffer.length} — nothing was checking.`, true)
          return steps
        }
        if (p.produced >= p.target) p.done = true
      } else {
        if (buffer.length >= BUF_CAP) {
          push(lines.blocked, `P${p.id} wants to write but the buffer is full (${buffer.length}/${BUF_CAP}) — wait.`)
        } else {
          const item = nextItem++
          buffer.push(item)
          p.produced += 1
          push(lines.produce, `P${p.id} writes item ${item} (buffer now ${buffer.length}/${BUF_CAP}).`)
          if (p.produced >= p.target) p.done = true
        }
      }
      active = null
    }

    active = 'C'
    if (buffer.length > 0) {
      const item = buffer.shift()!
      consumed += 1
      push(lines.consumeOk, `C consumes item ${item} — buffer now holds ${buffer.length}.`)
    } else {
      push(lines.consumeCheck, 'C finds the buffer empty — nothing to do this turn.')
    }
    active = null
  }

  push(
    lines.consumeOk,
    `Done: all ${TOTAL_ITEMS} items produced and consumed${variant === 'fixed' ? ', buffer never exceeded capacity' : ''}.`,
    true,
  )
  return steps
}

/* ---------------------------------------------------------------------------
 * Readers-Writers — a shared value that must always be even; a writer's
 * increment is honestly two steps, so an unsynchronized reader can catch it
 * mid-update (a torn read).
 * ------------------------------------------------------------------------ */

const N_READERS = 3
const WRITES_TARGET = 3
const READS_TARGET = 3

function runReadersWriters(variant: 'naive' | 'fixed'): ConcurrencyStep[] {
  const steps: ConcurrencyStep[] = []
  let value = 0
  let writerDone = 0
  let writerPhase: 'idle' | 'step1' = 'idle'
  const readers: ReaderState[] = Array.from({ length: N_READERS }, (_, id) => ({
    id, done: 0, target: READS_TARGET,
  }))
  let corrupted = false
  let active: string | null = null
  const log: string[] = []

  const lines = variant === 'naive'
    ? { intro: 3, read: 15, step1: 9, step2: 10, write: 10 }
    : { intro: 3, read: 18, step1: 12, step2: 12, write: 12 }

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyConState(),
        rwValue: value,
        rwWriterDone: writerDone,
        rwWriterTarget: WRITES_TARGET,
        rwReaders: readers.map(r => ({ ...r })),
        rwCorrupted: corrupted,
        rwLog: [...log],
        activeActor: active,
        done,
      },
    })
  }

  push(lines.intro, `Value starts at ${value} (always even by design). ${N_READERS} readers, 1 writer, ${WRITES_TARGET} writes to perform.`)

  const maxTicks = 40
  for (let tick = 0; tick < maxTicks; tick++) {
    if (writerDone >= WRITES_TARGET && readers.every(r => r.done >= r.target)) break

    for (const r of readers) {
      if (r.done >= r.target) continue
      active = `R${r.id}`
      const v = value
      r.done += 1
      const ok = v % 2 === 0
      log.push(`R${r.id} read ${v}${ok ? '' : ' ✗'}`)
      if (!ok) {
        corrupted = true
        push(lines.read, `R${r.id} reads value = ${v} — ODD. It caught the writer mid-update. This is a torn read.`, true)
        return steps
      }
      push(lines.read, `R${r.id} reads value = ${v}. Consistent.`)
      active = null
    }

    if (writerDone < WRITES_TARGET) {
      active = 'W'
      if (variant === 'naive') {
        if (writerPhase === 'idle') {
          value += 1
          writerPhase = 'step1'
          push(lines.step1, `Writer begins update #${writerDone + 1}: value → ${value} (mid-update — momentarily inconsistent).`)
        } else {
          value += 1
          writerPhase = 'idle'
          writerDone += 1
          push(lines.step2, `Writer finishes update #${writerDone}: value → ${value}.`)
        }
      } else {
        value += 1
        value += 1
        writerDone += 1
        push(lines.write, `Writer holds the lock and updates atomically: value → ${value}. No reader could see it mid-way.`)
      }
      active = null
    }
  }

  push(
    lines.read,
    corrupted
      ? 'Simulation ended.'
      : `Done: ${WRITES_TARGET} writes, ${N_READERS * READS_TARGET} reads, every single one consistent.`,
    true,
  )
  return steps
}

export const useConcurrencyStore = defineStore('concurrency', () => {
  const conId = ref('philosophers-naive')
  const trace = ref<ConcurrencyStep[]>([])
  const stepIndex = ref(0)
  const playing = ref(false)
  const speed = ref(1)

  const con = computed(() => CONCURRENCY.find(c => c.id === conId.value) ?? CONCURRENCY[0])
  const step = computed<ConcurrencyStep | undefined>(() => trace.value[stepIndex.value])
  const state = computed<ConcurrencyStepState>(() => step.value?.state ?? emptyConState())
  const atEnd = computed(() => stepIndex.value >= trace.value.length - 1)

  function buildTrace() {
    switch (conId.value) {
      case 'philosophers-naive': trace.value = runPhilosophers('naive'); break
      case 'philosophers-fixed': trace.value = runPhilosophers('fixed'); break
      case 'producer-consumer-naive': trace.value = runProducerConsumer('naive'); break
      case 'producer-consumer-fixed': trace.value = runProducerConsumer('fixed'); break
      case 'readers-writers-naive': trace.value = runReadersWriters('naive'); break
      case 'readers-writers-fixed': trace.value = runReadersWriters('fixed'); break
      default: trace.value = []
    }
    stepIndex.value = 0
    playing.value = false
  }

  function selectCon(id: string) {
    if (id === conId.value) return
    conId.value = id
    buildTrace()
  }

  function restart() {
    playing.value = false
    stepIndex.value = 0
  }

  function stepForward() {
    if (atEnd.value) {
      playing.value = false
      return
    }
    stepIndex.value += 1
  }

  function stepBack() {
    playing.value = false
    if (stepIndex.value > 0) stepIndex.value -= 1
  }

  function seek(i: number) {
    playing.value = false
    stepIndex.value = Math.min(Math.max(0, Math.round(i)), trace.value.length - 1)
  }

  function togglePlay() {
    if (!playing.value && atEnd.value) stepIndex.value = 0
    playing.value = !playing.value
  }

  buildTrace()

  return {
    conId,
    trace,
    stepIndex,
    playing,
    speed,
    con,
    step,
    state,
    atEnd,
    selectCon,
    restart,
    stepForward,
    stepBack,
    seek,
    togglePlay,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConcurrencyStore, import.meta.hot))
}
