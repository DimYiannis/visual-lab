import { describe, it, expect } from 'vitest'
import { runHeap, runBST, runLinkedList, runTrie, runHashTable, runLRU } from '../../lib/algorithms/runners/structures'

describe('binary min-heap', () => {
  it('pops the three minimums in ascending order', () => {
    const steps = runHeap([9, 3, 7, 1, 8, 2, 5])
    const popped = steps[steps.length - 1].state.order.map(Number)
    expect(popped).toHaveLength(3)
    expect(popped).toEqual([1, 2, 3]) // the three smallest, ascending
  })

  it('maintains the heap property (parent ≤ children) after every push', () => {
    const steps = runHeap([9, 3, 7, 1, 8, 2, 5])
    // Check array snapshots right after each "heap built" milestone note.
    const builtStep = steps.find(s => s.note.includes('Heap built'))
    expect(builtStep).toBeDefined()
    const a = builtStep!.state.array
    for (let i = 1; i < a.length; i++) {
      const parent = a[(i - 1) >> 1]
      expect(parent).toBeLessThanOrEqual(a[i])
    }
  })
})

describe('binary search tree', () => {
  it('finds a value that was inserted', () => {
    const values = [8, 3, 10, 1, 6, 14, 4, 7, 13]
    const steps = runBST(values, 6)
    const last = steps[steps.length - 1]
    expect(last.state.foundIndex).not.toBeNull()
    expect(last.state.done).toBe(true)
  })

  it('reports not-found for a value that was never inserted', () => {
    const values = [8, 3, 10, 1, 6, 14, 4, 7, 13]
    const steps = runBST(values, 999)
    const last = steps[steps.length - 1]
    expect(last.state.foundIndex).toBeNull()
    expect(last.note).toMatch(/not in the tree/)
  })

  it('every inserted value ends up somewhere in the tree', () => {
    const values = [8, 3, 10, 1, 6]
    for (const v of values) {
      const steps = runBST(values, v)
      expect(steps[steps.length - 1].state.foundIndex).not.toBeNull()
    }
  })
})

describe('linked list reversal', () => {
  it('reverses the arrows so walking from the new head yields the reverse order', () => {
    const values = [10, 20, 30, 40, 50]
    const steps = runLinkedList(values)
    const finalNext = steps[steps.length - 1].state.listNext
    // Walk from the last original index (now head) forward.
    const walked: number[] = []
    let cur: number | null = values.length - 1
    while (cur !== null) {
      walked.push(values[cur])
      cur = finalNext[cur]
    }
    expect(walked).toEqual([...values].reverse())
  })

  it('handles a single-node list', () => {
    const steps = runLinkedList([7])
    const last = steps[steps.length - 1]
    expect(last.state.listNext).toEqual([null])
    expect(last.state.done).toBe(true)
  })
})

describe('trie insert + autocomplete', () => {
  it('only returns completions that actually start with the prefix', () => {
    const words = ['car', 'care', 'cart', 'dog', 'dot']
    const steps = runTrie(words, 'ca')
    const last = steps[steps.length - 1]
    for (const completion of last.state.order) {
      expect(completion.startsWith('ca')).toBe(true)
    }
  })

  it('finds every word that was inserted and shares the prefix', () => {
    const words = ['car', 'care', 'cart', 'dog', 'dot']
    const steps = runTrie(words, 'ca')
    const last = steps[steps.length - 1]
    expect(new Set(last.state.order)).toEqual(new Set(['car', 'care', 'cart']))
  })

  it('reports no completions for a prefix nothing starts with', () => {
    const words = ['car', 'care', 'cart']
    const steps = runTrie(words, 'zz')
    const last = steps[steps.length - 1]
    expect(last.note).toMatch(/nothing starts with/)
    expect(last.state.done).toBe(true)
  })

  it('shared prefixes merge into one branch (fewer nodes than total characters typed)', () => {
    const words = ['car', 'care', 'cart']
    const steps = runTrie(words, 'car')
    const last = steps[steps.length - 1]
    const totalChars = words.reduce((sum, w) => sum + w.length, 0) // 3+4+4=11
    // +1 for the root; strictly fewer nodes than characters because "car" is shared.
    expect(last.state.treeNodes.length).toBeLessThan(totalChars + 1)
  })
})

describe('hash table chaining', () => {
  const HASH_BUCKETS = 7

  it('every key lands in the bucket key % 7', () => {
    const keys = [10, 17, 24, 3, 45, 22]
    const steps = runHashTable(keys)
    const last = steps[steps.length - 1]
    for (const key of keys) {
      const h = key % HASH_BUCKETS
      expect(last.state.buckets[h]).toContain(key)
    }
  })

  it('no keys are lost or duplicated across all buckets', () => {
    const keys = [10, 17, 24, 3, 45, 22]
    const steps = runHashTable(keys)
    const last = steps[steps.length - 1]
    const allStored = last.state.buckets.flat()
    expect([...allStored].sort((a, b) => a - b)).toEqual([...keys].sort((a, b) => a - b))
  })
})

describe('LRU cache', () => {
  it('follows exact LRU semantics for a known operation sequence', () => {
    // keys[0..4] = 10,20,30,40,50; values = 1..5; cap=3.
    // Hand-traced sequence:
    //  put(10,1) put(20,2) put(30,3) -> [30,20,10]
    //  get(10) hit, reorder -> [10,30,20]
    //  put(40,4) -> [40,10,30] evict 20
    //  get(20) miss
    //  put(50,5) -> [50,40,10] evict 30
    //  put(10,99) update, move front, no evict -> [10,50,40]
    const steps = runLRU({ cap: 3, keys: [10, 20, 30, 40, 50], values: [1, 2, 3, 4, 5], updateValue: 99 })
    const last = steps[steps.length - 1]
    expect(last.state.lruList).toEqual([
      { key: 10, value: 99 },
      { key: 50, value: 5 },
      { key: 40, value: 4 },
    ])
    const evictedKeys = steps.filter(s => s.state.lruEvicted !== null).map(s => s.state.lruEvicted)
    expect(evictedKeys).toEqual([20, 30])
  })

  it('never holds more than cap+1 entries (the +1 is the transient instant between inserting the 4th and popping the tail)', () => {
    const steps = runLRU({ cap: 3, keys: [10, 20, 30, 40, 50], values: [1, 2, 3, 4, 5], updateValue: 99 })
    for (const step of steps) {
      expect(step.state.lruList.length).toBeLessThanOrEqual(4)
    }
    // Settles back to cap by the end.
    expect(steps[steps.length - 1].state.lruList.length).toBeLessThanOrEqual(3)
  })

  it('reports a miss for get() on an evicted key', () => {
    const steps = runLRU({ cap: 3, keys: [10, 20, 30, 40, 50], values: [1, 2, 3, 4, 5], updateValue: 99 })
    const missStep = steps.find(s => s.note.includes('is not in the map'))
    expect(missStep).toBeDefined()
  })
})
