<script setup lang="ts">
/**
 * Data Structures — a curriculum page, ordered foundational → specialized.
 * Static reference content; structures that have a live demo deep-link into
 * the Algorithm Lab (/algorithms?algo=…). No store — this page is a map,
 * the Lab is the territory.
 */

interface Demo {
  label: string
  algo: string
}

interface StructureCard {
  name: string
  what: string
  ops: string[]
  why: string
  demos: Demo[]
}

interface Tier {
  title: string
  subtitle: string
  items: StructureCard[]
}

const TIERS: Tier[] = [
  {
    title: 'Core — must know',
    subtitle: 'Get these rock solid first. Everything else is built from them.',
    items: [
      {
        name: 'Arrays',
        what: 'One contiguous block of memory; the index is an address offset.',
        ops: ['index O(1)', 'search O(n)', 'insert middle O(n)'],
        why: 'The default container everywhere. Sorting and searching live here.',
        demos: [
          { label: 'Binary search', algo: 'binary-search' },
          { label: 'Quicksort', algo: 'quicksort' },
          { label: 'Merge sort', algo: 'mergesort' },
        ],
      },
      {
        name: 'Linked lists',
        what: 'Nodes scattered in memory, stitched together by next pointers.',
        ops: ['insert/delete at node O(1)', 'index O(n)'],
        why: 'Cheap splicing where arrays shift everything. Pointer surgery 101.',
        demos: [{ label: 'Reverse a list', algo: 'linked-list' }],
      },
      {
        name: 'Stacks',
        what: 'LIFO: push and pop the same end. Last in, first out.',
        ops: ['push O(1)', 'pop O(1)'],
        why: 'Parsing, undo history, call stacks — recursion IS a stack.',
        demos: [{ label: 'DFS call stack', algo: 'dfs' }],
      },
      {
        name: 'Queues',
        what: 'FIFO: enqueue at the back, dequeue at the front. Deques do both ends.',
        ops: ['enqueue O(1)', 'dequeue O(1)'],
        why: 'Fair processing order. Swap a stack for a queue and DFS becomes BFS.',
        demos: [
          { label: 'BFS queue', algo: 'bfs' },
          { label: "Kahn's queue", algo: 'kahn' },
        ],
      },
      {
        name: 'Hash tables',
        what: 'hash(key) computes the bucket — lookup jumps, it never scans.',
        ops: ['insert avg O(1)', 'lookup avg O(1)', 'worst O(n)'],
        why: 'Backbone of dicts and sets. Collisions and load factor are the fine print.',
        demos: [{ label: 'Chaining insert', algo: 'hash-table' }],
      },
      {
        name: 'Binary search trees',
        what: 'Left < node < right at every fork; insertion order becomes shape.',
        ops: ['insert/search avg O(log n)', 'worst O(n)'],
        why: 'Sorted data with cheap inserts. The degenerate case motivates balancing.',
        demos: [{ label: 'BST insert + search', algo: 'bst' }],
      },
    ],
  },
  {
    title: 'The working engineer\'s toolkit',
    subtitle: 'These run the systems you use daily — schedulers, databases, routers, editors.',
    items: [
      {
        name: 'Binary heaps',
        what: 'Complete tree in an array; only rule: parent ≤ children.',
        ops: ['push O(log n)', 'pop-min O(log n)', 'peek O(1)'],
        why: 'Priority queues, heapsort, top-k problems. Dijkstra runs on one.',
        demos: [
          { label: 'Min-heap push/pop', algo: 'heap' },
          { label: 'Priority queue in Dijkstra', algo: 'dijkstra' },
        ],
      },
      {
        name: 'Balanced trees',
        what: 'AVL / red-black: BSTs that rotate themselves back to log n height.',
        ops: ['all ops O(log n) guaranteed'],
        why: 'They fix the BST worst case, and they are why std::map, TreeMap and database indexes stay fast no matter the insert order. Understand the rotation idea; libraries carry the details.',
        demos: [],
      },
      {
        name: 'Tries (prefix trees)',
        what: 'One node per character; a word is a root-to-leaf path.',
        ops: ['insert/lookup O(word length)'],
        why: 'Autocomplete, spell-check, prefix matching — cost independent of dictionary size.',
        demos: [{ label: 'Insert + autocomplete', algo: 'trie' }],
      },
      {
        name: 'Graphs',
        what: 'Nodes + edges; stored as adjacency lists (usually) or a matrix.',
        ops: ['adj list: O(V + E) space', 'edge check O(deg)'],
        why: 'Everything is a graph eventually. Know BFS and DFS cold.',
        demos: [
          { label: 'BFS', algo: 'bfs' },
          { label: 'DFS', algo: 'dfs' },
          { label: 'Topological sort', algo: 'kahn' },
          { label: 'Shortest paths', algo: 'dijkstra' },
        ],
      },
    ],
  },
  {
    title: 'Good to know',
    subtitle: 'Show up often; learn them when the tiers above feel easy.',
    items: [
      {
        name: 'Sets',
        what: 'Membership only, no values. Hash-based (unordered) or tree-based (sorted).',
        ops: ['contains avg O(1) hash / O(log n) tree'],
        why: 'Dedup and "seen" checks — BFS/DFS lean on one constantly.',
        demos: [{ label: 'seen set in BFS', algo: 'bfs' }],
      },
      {
        name: 'Union-Find',
        what: 'Disjoint sets as a forest; find follows parents, union merges roots.',
        ops: ['find/union ~O(1) amortized'],
        why: "Connectivity queries and Kruskal's MST — network design, clustering, image segmentation. Path compression is the magic.",
        demos: [{ label: "Kruskal's MST", algo: 'kruskal' }],
      },
      {
        name: 'Segment / Fenwick trees',
        what: 'Tree over array intervals; each node summarizes a range.',
        ops: ['range query O(log n)', 'point update O(log n)'],
        why: 'Range sums/mins with updates — where prefix sums stop working.',
        demos: [],
      },
      {
        name: 'Bloom filters',
        what: 'Probabilistic membership: k hash bits per key, false positives possible, false negatives never.',
        ops: ['insert/query O(k)', 'tiny space'],
        why: '"Definitely not present" for pennies — caches and databases use them as gatekeepers.',
        demos: [],
      },
    ],
  },
  {
    title: 'Specialized',
    subtitle: 'Nice-to-have, domain dependent. Recognize them; reach for them when the domain demands.',
    items: [
      {
        name: 'B-trees / B+ trees',
        what: 'Wide, shallow search trees — hundreds of keys per node.',
        ops: ['all ops O(log n), disk-friendly'],
        why: 'Databases and filesystems: one node ≈ one disk page.',
        demos: [],
      },
      {
        name: 'Skip lists',
        what: 'Sorted linked lists stacked with express lanes; randomness replaces rotations.',
        ops: ['search/insert avg O(log n)'],
        why: 'Balanced-tree performance, simpler code. Redis sorted sets use them.',
        demos: [],
      },
      {
        name: 'LRU cache',
        what: 'Hash map + doubly linked list: O(1) lookup, O(1) recency bump, evict the tail.',
        ops: ['get/put O(1)'],
        why: 'A lesson in composition: two simple structures combine into something neither can do alone. Real eviction policy in browsers, CDNs and databases.',
        demos: [{ label: 'Get / put / evict', algo: 'lru-cache' }],
      },
      {
        name: 'Suffix trees / arrays',
        what: 'Index every suffix of a string for instant substring queries.',
        ops: ['substring search O(m)'],
        why: 'Heavy string processing: search engines, bioinformatics.',
        demos: [],
      },
    ],
  },
]

const PRIORITY = [
  'Arrays, linked lists, stacks, queues, hash tables — rock solid first.',
  'Trees (BST) and basic graph traversal — next tier.',
  'Heaps and tries — small structures that unlock schedulers, priority queues and text tooling.',
  'Union-Find, balanced trees, segment trees — once the rest is comfortable.',
]

useHead({ title: 'Data Structures — Visual Math Workspace' })
</script>

<template>
  <main class="mx-auto flex min-h-full max-w-7xl flex-col gap-4 p-3 sm:p-4">
    <header class="flex items-baseline justify-between px-1">
      <h1 class="font-display text-lg font-700 tracking-tight text-paper">
        Data <span class="text-live">Structures</span>
      </h1>
      <nav class="flex gap-4">
        <NuxtLink to="/algorithms" class="font-display text-xs text-paper-dim transition-colors hover:text-live">
          Algorithm Lab →
        </NuxtLink>
        <NuxtLink to="/" class="font-display text-xs text-paper-dim transition-colors hover:text-live">
          Math workspace →
        </NuxtLink>
      </nav>
    </header>

    <p class="px-1 font-display text-sm text-paper-dim">
      Roughly ordered from foundational to specialized. Cards with a
      <span class="text-live">demo</span> open live in the Algorithm Lab.
    </p>

    <section v-for="tier in TIERS" :key="tier.title" class="space-y-2">
      <div class="px-1">
        <h2 class="font-display text-sm font-600 uppercase tracking-[0.14em] text-paper">
          {{ tier.title }}
        </h2>
        <p class="font-display text-xs text-paper-faint">{{ tier.subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="item in tier.items"
          :key="item.name"
          class="graph-paper flex flex-col gap-2 rounded-xl p-4 shadow-panel"
        >
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-display text-sm font-600 text-paper">{{ item.name }}</h3>
            <span
              v-if="item.demos.length"
              class="shrink-0 rounded-full bg-live/10 px-2 py-0.5 font-mono text-[10px] text-live"
            >
              demo
            </span>
          </div>
          <p class="font-display text-xs leading-relaxed text-paper-dim">{{ item.what }}</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="op in item.ops"
              :key="op"
              class="rounded border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-paper-dim"
            >
              {{ op }}
            </span>
          </div>
          <p class="font-display text-xs leading-relaxed text-paper-faint">{{ item.why }}</p>
          <div v-if="item.demos.length" class="mt-auto flex flex-wrap gap-1.5 pt-1">
            <NuxtLink
              v-for="d in item.demos"
              :key="d.algo + d.label"
              :to="`/algorithms?algo=${d.algo}`"
              class="rounded-md border border-live/30 bg-live/5 px-2 py-1 font-display text-[11px] text-live transition-colors hover:border-live/70 hover:bg-live/10"
            >
              {{ d.label }} →
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <footer class="graph-paper rounded-xl p-4 shadow-panel">
      <h2 class="font-display text-sm font-600 text-paper">Suggested order</h2>
      <ol class="mt-2 space-y-1">
        <li
          v-for="(step, i) in PRIORITY"
          :key="i"
          class="flex gap-2 font-display text-xs text-paper-dim"
        >
          <span class="font-mono text-live">{{ i + 1 }}.</span>
          <span>{{ step }}</span>
        </li>
      </ol>
    </footer>
  </main>
</template>
