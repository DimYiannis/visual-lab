import type { AlgoStep, TreeNodeSnap } from '../types'
import { HASH_BUCKETS, emptyState } from '../types'
import { shuffle, randomValues } from '../random'

/** Complete-binary-tree layout: heap index → canvas position. */
function heapLayout(len: number, values: number[]): TreeNodeSnap[] {
  const nodes: TreeNodeSnap[] = []
  for (let i = 0; i < len; i++) {
    const d = Math.floor(Math.log2(i + 1))
    const k = i - (2 ** d - 1)
    nodes.push({ id: i, value: values[i], x: (k + 0.5) * (640 / 2 ** d), y: 52 + d * 105 })
  }
  return nodes
}

export function runHeap(values: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const a: number[] = []
  const popped: number[] = []
  let active: number[] = []
  let focus: number | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        array: [...a],
        treeNodes: heapLayout(a.length, a),
        treeLinks: a.slice(1).map((_, j) => [(j + 1 - 1) >> 1, j + 1] as [number, number]),
        treeActive: [...active],
        treeFocus: focus,
        order: popped.map(String),
        done,
      },
    })
  }

  for (const x of values) {
    a.push(x)
    focus = a.length - 1
    active = []
    push(6, `push(${x}): append at index ${a.length - 1} — the next free leaf.`)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      active = [p, i]
      push(10, `Parent a[${p}] = ${a[p]} vs new a[${i}] = ${a[i]}.`)
      if (a[p] <= a[i]) {
        push(11, `${a[p]} ≤ ${a[i]} — heap property holds, stop sifting.`)
        break
      }
      const child = a[i]
      ;[a[p], a[i]] = [a[i], a[p]]
      push(12, `${child} bubbles up to index ${p}.`)
      i = p
      focus = i
    }
    active = []
    focus = null
  }

  push(16, `Heap built from ${values.length} pushes. Now pop the minimum three times.`)
  for (let round = 0; round < 3; round++) {
    const min = a[0]
    const last = a[a.length - 1]
    active = [0, a.length - 1]
    focus = 0
    ;[a[0], a[a.length - 1]] = [a[a.length - 1], a[0]]
    push(18, `Swap min ${min} with last leaf ${last} — removal at the end is O(1).`)
    a.pop()
    popped.push(min)
    active = []
    push(19, `Detach ${min}. New root ${a[0]} probably breaks the heap — sift it down.`)
    let i = 0
    while (true) {
      const l = 2 * i + 1
      const r = 2 * i + 2
      let s = i
      if (l < a.length && a[l] < a[s]) s = l
      if (r < a.length && a[r] < a[s]) s = r
      active = [i, l, r].filter(k => k < a.length)
      if (l >= a.length) {
        push(24, `a[${i}] = ${a[i]} has no children — nowhere lower to go.`)
      } else {
        push(24, `Family: a[${i}] = ${a[i]}, children ${a[l]}${r < a.length ? ` and ${a[r]}` : ''}. Smallest: ${a[s]}.`)
      }
      if (s === i) {
        push(27, `${a[i]} ≤ its children — settled.`)
        break
      }
      const sink = a[i]
      ;[a[i], a[s]] = [a[s], a[i]]
      push(28, `${sink} sinks; ${a[i]} rises to index ${i}.`)
      i = s
      focus = i
    }
    active = []
    focus = null
    push(30, `return ${min} — extraction ${round + 1} done.`)
  }
  push(30, `Extracted ${popped.join(', ')} — in sorted order. Repeat n times and you have heapsort.`, true)
  return steps
}

interface BSTNode {
  id: number
  v: number
  left: number | null
  right: number | null
}

export function runBST(values: number[], target: number): AlgoStep[] {
  const steps: AlgoStep[] = []
  const nodes: BSTNode[] = []
  let root: number | null = null
  let active: number[] = []
  let visited: number[] = []
  let focus: number | null = null
  let found: number | null = null

  /** In-order rank → x, depth → y; recomputed per snapshot as the tree grows. */
  const layout = (): { snaps: TreeNodeSnap[]; links: Array<[number, number]> } => {
    const snaps: TreeNodeSnap[] = []
    const links: Array<[number, number]> = []
    if (root === null) return { snaps, links }
    const depths = new Map<number, number>()
    let rank = 0
    let maxDepth = 0
    const walk = (id: number, depth: number) => {
      const n = nodes[id]
      depths.set(id, depth)
      maxDepth = Math.max(maxDepth, depth)
      if (n.left !== null) {
        links.push([id, n.left])
        walk(n.left, depth + 1)
      }
      const x = 40 + (rank + 0.5) * (560 / nodes.length)
      rank += 1
      snaps.push({ id, value: n.v, x, y: 0 })
      if (n.right !== null) {
        links.push([id, n.right])
        walk(n.right, depth + 1)
      }
    }
    walk(root, 0)
    const spacing = Math.min(95, 330 / Math.max(1, maxDepth))
    for (const s of snaps) s.y = 44 + depths.get(s.id)! * spacing
    return { snaps, links }
  }

  const push = (line: number, note: string, done = false) => {
    const { snaps, links } = layout()
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        treeNodes: snaps,
        treeLinks: links,
        treeActive: [...active],
        treeVisited: [...visited],
        treeFocus: focus,
        foundIndex: found,
        done,
      },
    })
  }

  for (const v of values) {
    active = []
    visited = []
    if (root === null) {
      nodes.push({ id: 0, v, left: null, right: null })
      root = 0
      focus = 0
      push(3, `Tree empty — ${v} becomes the root.`)
      focus = null
      continue
    }
    let cur = root
    while (true) {
      active = [cur]
      visited = [...visited, cur]
      const goLeft = v < nodes[cur].v
      push(4, `${v} vs ${nodes[cur].v}: ${v} is ${goLeft ? 'smaller — left' : 'bigger (or equal) — right'}.`)
      const child = goLeft ? nodes[cur].left : nodes[cur].right
      if (child === null) {
        const id = nodes.length
        nodes.push({ id, v, left: null, right: null })
        if (goLeft) nodes[cur].left = id
        else nodes[cur].right = id
        focus = id
        active = []
        push(3, `${nodes[cur].v}'s ${goLeft ? 'left' : 'right'} slot is empty — ${v} leafs there.`)
        focus = null
        break
      }
      cur = child
      push(goLeft ? 5 : 7, `Descend ${goLeft ? 'left' : 'right'} to ${nodes[cur].v}.`)
    }
  }

  active = []
  visited = []
  push(11, `Tree built. Now search for ${target}.`)
  let cur: number | null = root
  let hops = 0
  while (cur !== null) {
    active = [cur]
    visited = [...visited, cur]
    hops += 1
    push(12, `${target} vs ${nodes[cur].v}.`)
    if (target === nodes[cur].v) {
      found = cur
      push(13, `Found ${target} in ${hops} comparison${hops === 1 ? '' : 's'} — the shape did the binary search.`, true)
      return steps
    }
    const goLeft = target < nodes[cur].v
    const child: number | null = goLeft ? nodes[cur].left : nodes[cur].right
    push(14, child === null
      ? `${goLeft ? 'Left' : 'Right'} child is None — dead end.`
      : `Go ${goLeft ? 'left' : 'right'}.`)
    cur = child
  }
  push(16, `${target} is not in the tree — return False after only ${hops} comparisons.`, true)
  return steps
}

export function runLinkedList(values: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const n = values.length
  // Slot i holds values[i] forever; only the arrows (next) change.
  const next: Array<number | null> = values.map((_, i) => (i < n - 1 ? i + 1 : null))
  let prev: number | null = null
  let curr: number | null = 0
  let nxt: number | null = null
  let activeNode: number | null = null

  const push = (line: number, note: string, done = false) => {
    const cursors: Record<string, number> = {}
    if (prev !== null) cursors.prev = prev
    if (curr !== null) cursors.curr = curr
    if (nxt !== null) cursors.nxt = nxt
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        listValues: [...values],
        listNext: [...next],
        listActive: activeNode,
        cursors,
        done,
      },
    })
  }

  push(7, 'prev = None — the reversed part is empty so far.')
  push(8, `curr starts at the head (${values[0]}).`)
  while (curr !== null) {
    nxt = next[curr]
    activeNode = null
    push(10, nxt === null
      ? `Save next: None — ${values[curr]} is the last node.`
      : `Save next = ${values[nxt]} first, or the rest of the list is lost.`)
    next[curr] = prev
    activeNode = curr
    push(11, prev === null
      ? `Flip: ${values[curr]} now points to None — it will be the tail.`
      : `Flip: ${values[curr]} now points back to ${values[prev]}.`)
    prev = curr
    activeNode = null
    push(12, `prev advances to ${values[prev]}.`)
    curr = nxt
    push(13, curr === null
      ? 'curr = None — we ran off the end.'
      : `curr advances to ${values[curr]}.`)
  }
  nxt = null
  push(14, `return ${prev !== null ? values[prev] : '?'} — the new head. Every arrow now points the other way.`, true)
  return steps
}

/** Word groups sharing a prefix — two groups per trie so branches merge visibly. */
const WORD_GROUPS: Array<{ prefix: string; words: string[] }> = [
  { prefix: 'ca', words: ['car', 'cat', 'care', 'can', 'cart'] },
  { prefix: 'do', words: ['dog', 'dot', 'dose', 'do', 'dome'] },
  { prefix: 'te', words: ['tea', 'team', 'teach', 'ten', 'tent'] },
  { prefix: 'su', words: ['sun', 'sung', 'sunny', 'sum', 'surf'] },
  { prefix: 'ba', words: ['bat', 'bath', 'bad', 'ban', 'bar'] },
]

export function pickTrieInput(): { words: string[]; prefix: string } {
  const [a, b] = shuffle(WORD_GROUPS).slice(0, 2)
  const words = [...shuffle(a.words).slice(0, 3), ...shuffle(b.words).slice(0, 3)]
  return { words, prefix: a.prefix }
}

interface TrieNode {
  id: number
  ch: string
  kids: Record<string, number>
  isWord: boolean
}

export function runTrie(words: string[], prefix: string): AlgoStep[] {
  const steps: AlgoStep[] = []
  const nodes: TrieNode[] = [{ id: 0, ch: '·', kids: {}, isWord: false }]
  const completions: string[] = []
  let active: number[] = []
  let visited: number[] = []
  let focus: number | null = null
  let found: number | null = null

  /** Leaves claim x slots left→right; parents center over their children. */
  const layout = (): { snaps: TreeNodeSnap[]; links: Array<[number, number]> } => {
    const snaps: TreeNodeSnap[] = []
    const links: Array<[number, number]> = []
    let leaf = 0
    let maxDepth = 1
    const place = (id: number, depth: number): number => {
      maxDepth = Math.max(maxDepth, depth)
      const kidIds = Object.keys(nodes[id].kids).sort().map(c => nodes[id].kids[c])
      let x: number
      if (!kidIds.length) {
        leaf += 1
        x = leaf
      } else {
        const xs = kidIds.map((k) => {
          links.push([id, k])
          return place(k, depth + 1)
        })
        x = (xs[0] + xs[xs.length - 1]) / 2
      }
      snaps.push({ id, value: nodes[id].ch, x, y: depth })
      return x
    }
    place(0, 0)
    const spacing = Math.min(85, 330 / maxDepth)
    for (const s of snaps) {
      s.x = 40 + (s.x - 0.5) * (560 / Math.max(1, leaf))
      s.y = 40 + s.y * spacing
    }
    return { snaps, links }
  }

  const push = (line: number, note: string, done = false) => {
    const { snaps, links } = layout()
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        treeNodes: snaps,
        treeLinks: links,
        treeActive: [...active],
        treeVisited: [...visited],
        treeFocus: focus,
        treeEnds: nodes.filter(n => n.isWord).map(n => n.id),
        foundIndex: found,
        order: [...completions],
        done,
      },
    })
  }

  for (const word of words) {
    let node = 0
    active = []
    visited = [0]
    focus = null
    push(7, `insert("${word}") — every word starts at the root.`)
    for (const ch of word) {
      active = [node]
      if (!(ch in nodes[node].kids)) {
        const id = nodes.length
        nodes.push({ id, ch, kids: {}, isWord: false })
        nodes[node].kids[ch] = id
        focus = id
        push(10, `No '${ch}' branch here — grow one.`)
      } else {
        focus = nodes[node].kids[ch]
        push(9, `'${ch}' branch already exists — shared prefix, shared path.`)
      }
      node = nodes[node].kids[ch]
      visited = [...visited, node]
      push(11, `Step down to '${ch}'.`)
    }
    nodes[node].isWord = true
    active = []
    push(12, `Ring the node: "${word}" ends here.`)
    focus = null
  }

  // complete(prefix)
  active = []
  visited = [0]
  focus = null
  push(15, `complete("${prefix}") — walk the prefix first.`)
  let node = 0
  for (const ch of prefix) {
    active = [node]
    if (!(ch in nodes[node].kids)) {
      push(18, `No '${ch}' branch — nothing starts with "${prefix}".`, true)
      return steps
    }
    node = nodes[node].kids[ch]
    visited = [...visited, node]
    focus = node
    push(19, `Follow '${ch}'.`)
  }
  active = []
  push(20, `Prefix walked in ${prefix.length} steps. Everything below this node starts with "${prefix}".`)
  const gather = (id: number, word: string) => {
    visited = [...visited, id]
    if (nodes[id].isWord) {
      completions.push(word)
      found = id
      push(21, `"${word}" — completion #${completions.length}.`)
      found = null
    }
    for (const ch of Object.keys(nodes[id].kids).sort()) {
      gather(nodes[id].kids[ch], word + ch)
    }
  }
  gather(node, prefix)
  push(21, `Autocomplete for "${prefix}": ${completions.join(', ')}.`, true)
  return steps
}

export function runHashTable(keys: number[]): AlgoStep[] {
  const steps: AlgoStep[] = []
  const buckets: number[][] = Array.from({ length: HASH_BUCKETS }, () => [])
  const pending = [...keys]
  let activeKey: number | null = null
  let activeBucket: number | null = null

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        buckets: buckets.map(b => [...b]),
        pendingKeys: [...pending],
        activeKey,
        activeBucket,
        done,
      },
    })
  }

  push(3, `${HASH_BUCKETS} empty buckets. ${keys.length} keys waiting to move in.`)
  for (const key of keys) {
    activeKey = key
    activeBucket = null
    const h = key % HASH_BUCKETS
    push(8, `hash(${key}) = ${key} % ${HASH_BUCKETS} = ${h} — computed, not searched.`)
    activeBucket = h
    const chain = buckets[h]
    push(10, chain.length
      ? `Bucket ${h} already holds [${chain.join(', ')}] — ${key} is not among them.`
      : `Bucket ${h} is empty — no duplicates possible.`)
    chain.push(key)
    pending.shift()
    push(12, chain.length > 1
      ? `Collision! ${key} chains behind ${chain.slice(0, -1).join(', ')} in bucket ${h}.`
      : `${key} moves into bucket ${h}.`)
  }
  activeKey = null
  activeBucket = null
  const longest = Math.max(...buckets.map(b => b.length))
  push(
    12,
    `All stored. Load factor ${keys.length}/${HASH_BUCKETS} ≈ ${(keys.length / HASH_BUCKETS).toFixed(1)}, longest chain ${longest} — lookups cost about that.`,
    true,
  )
  return steps
}

interface LRUInput {
  cap: number
  keys: number[]
  values: number[]
  updateValue: number
}

export function pickLRUInput(): LRUInput {
  const keys = randomValues(5)
  const values = randomValues(5)
  const updateValue = randomValues(1)[0]
  return { cap: 3, keys, values, updateValue }
}

export function runLRU({ cap, keys, values, updateValue }: LRUInput): AlgoStep[] {
  const steps: AlgoStep[] = []
  const list: Array<{ key: number; value: number }> = []
  const opsLog: string[] = []
  let evicted: number | null = null

  type Op = { verb: 'get' | 'put'; key: number; value?: number; label: string }
  const plan: Op[] = [
    { verb: 'put', key: keys[0], value: values[0], label: `put(${keys[0]}, ${values[0]})` },
    { verb: 'put', key: keys[1], value: values[1], label: `put(${keys[1]}, ${values[1]})` },
    { verb: 'put', key: keys[2], value: values[2], label: `put(${keys[2]}, ${values[2]})` },
    { verb: 'get', key: keys[0], label: `get(${keys[0]})` },
    { verb: 'put', key: keys[3], value: values[3], label: `put(${keys[3]}, ${values[3]})` },
    { verb: 'get', key: keys[1], label: `get(${keys[1]})` },
    { verb: 'put', key: keys[4], value: values[4], label: `put(${keys[4]}, ${values[4]})` },
    { verb: 'put', key: keys[0], value: updateValue, label: `put(${keys[0]}, ${updateValue})` },
  ]
  const opsQueue = plan.map(o => o.label)

  const push = (line: number, note: string, done = false) => {
    steps.push({
      line,
      note,
      state: {
        ...emptyState(),
        lruList: list.map(n => ({ ...n })),
        lruCap: cap,
        lruEvicted: evicted,
        opsQueue: [...opsQueue],
        opsLog: [...opsLog],
        done,
      },
    })
  }

  push(7, `Capacity ${cap}: at most ${cap} entries kept. ${plan.length} operations queued.`)

  for (const op of plan) {
    opsQueue.shift()
    evicted = null
    if (op.verb === 'get') {
      const idx = list.findIndex(n => n.key === op.key)
      if (idx === -1) {
        opsLog.push(`${op.label} → miss`)
        push(25, `${op.label}: key ${op.key} is not in the map — return -1.`)
        continue
      }
      const [node] = list.splice(idx, 1)
      push(28, `${op.label}: found it — unlink node ${op.key} from wherever it sits.`)
      list.unshift(node)
      opsLog.push(`${op.label} → hit ${node.value}`)
      push(29, `Push ${op.key} to the front — being read just made it most recent.`)
      continue
    }
    // put
    const idx = list.findIndex(n => n.key === op.key)
    if (idx !== -1) {
      list.splice(idx, 1)
      push(33, `${op.label}: key ${op.key} already cached — unlink the old node first.`)
    }
    list.unshift({ key: op.key, value: op.value! })
    push(37, `${op.label}: push the new node to the front — most recently used.`)
    if (list.length > cap) {
      const stale = list.pop()!
      evicted = stale.key
      opsLog.push(`${op.label} → evicted ${stale.key}`)
      push(40, `Over capacity: drop the tail — key ${stale.key} was least recently used.`)
    } else {
      opsLog.push(op.label)
    }
  }

  evicted = null
  push(
    41,
    `Done. Final cache, most- to least-recently-used: ${list.map(n => n.key).join(' → ')}.`,
    true,
  )
  return steps
}
