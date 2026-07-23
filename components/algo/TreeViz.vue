<script setup lang="ts">
/**
 * Tree visualization (heap + BST). Positions come precomputed in each trace
 * snapshot (heap: complete-tree formula; BST: in-order rank × depth), so
 * this component just draws circles and links.
 *
 * For the heap, the array row below the tree is the same data — the
 * array/tree duality IS the lesson, so both highlight in lockstep.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{
  state: StepState
  /** BST search target, or trie prefix string (null elsewhere). */
  target: number | string | null
  orderLabel: string
}>()

const targetChip = computed(() =>
  props.target === null
    ? null
    : typeof props.target === 'string'
      ? `prefix = "${props.target}"`
      : `target = ${props.target}`,
)

const R = 19

const nodeById = computed(() => new Map(props.state.treeNodes.map(n => [n.id, n])))

const links = computed(() =>
  props.state.treeLinks
    .map(([p, c]) => {
      const a = nodeById.value.get(p)
      const b = nodeById.value.get(c)
      if (!a || !b) return null
      const onPath = props.state.treeVisited.includes(p) && (props.state.treeVisited.includes(c) || props.state.treeActive.includes(c))
      return { key: `${p}-${c}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, onPath }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null),
)

function nodeFill(id: number): string {
  if (props.state.foundIndex === id) return 'fill-match'
  if (props.state.treeFocus === id) return 'fill-live'
  return 'fill-ink-800'
}

function nodeStroke(id: number): string {
  if (props.state.foundIndex === id) return 'stroke-match'
  if (props.state.treeActive.includes(id)) return 'stroke-goal'
  if (props.state.treeFocus === id) return 'stroke-live'
  if (props.state.treeVisited.includes(id)) return 'stroke-paper'
  return 'stroke-ink-600'
}

function cellClass(i: number): string {
  const s = props.state
  if (s.treeFocus === i) return 'border-live text-ink-950 bg-live'
  if (s.treeActive.includes(i)) return 'border-goal text-goal bg-goal/10'
  return 'border-ink-600 bg-ink-800 text-paper'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div v-if="targetChip" class="flex justify-center pt-1">
      <span class="rounded-full border border-goal/40 bg-goal/10 px-3 py-0.5 font-mono text-sm text-goal">
        {{ targetChip }}
      </span>
    </div>

    <svg
      viewBox="0 0 640 400"
      class="min-h-0 w-full flex-1"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Tree being built by the data structure"
    >
      <line
        v-for="l in links"
        :key="l.key"
        :x1="l.x1"
        :y1="l.y1"
        :x2="l.x2"
        :y2="l.y2"
        stroke-width="2"
        :class="l.onPath ? 'stroke-derived' : 'stroke-ink-600'"
      />
      <g v-for="n in state.treeNodes" :key="n.id">
        <!-- Trie word-end marker: violet outer ring -->
        <circle
          v-if="state.treeEnds.includes(n.id)"
          :cx="n.x"
          :cy="n.y"
          :r="R + 4"
          fill="none"
          stroke-width="1.5"
          class="stroke-derived"
        />
        <circle :cx="n.x" :cy="n.y" :r="R" stroke-width="2" :class="[nodeFill(n.id), nodeStroke(n.id)]" />
        <text
          :x="n.x"
          :y="n.y + 5"
          text-anchor="middle"
          class="pointer-events-none font-mono text-[14px] font-medium"
          :class="state.treeFocus === n.id || state.foundIndex === n.id ? 'fill-ink-950' : 'fill-paper'"
        >
          {{ n.value }}
        </text>
      </g>
    </svg>

    <!-- Heap only: the same structure as a flat array -->
    <div v-if="state.array.length" class="flex items-center justify-center gap-1 px-1 pt-1">
      <span class="pr-2 font-display text-[11px] uppercase tracking-wider text-paper-faint">as array</span>
      <div v-for="(v, i) in state.array" :key="i" class="flex flex-col items-center">
        <span
          class="min-w-[34px] rounded border px-1 py-0.5 text-center font-mono text-[12px] transition-colors"
          :class="cellClass(i)"
        >
          {{ v }}
        </span>
        <span class="font-mono text-[9px] text-paper-faint">{{ i }}</span>
      </div>
    </div>

    <div v-if="orderLabel" class="flex min-h-[26px] items-center gap-2 px-1 pt-1.5">
      <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">{{ orderLabel }}</span>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="(o, oi) in state.order"
          :key="oi"
          class="rounded border px-1.5 py-0.5 font-mono text-[12px] transition-colors"
          :class="state.done ? 'border-match/50 bg-match/10 text-match' : 'border-ink-600 bg-ink-800 text-paper'"
        >
          {{ o }}
        </span>
        <span v-if="!state.order.length" class="font-mono text-[12px] text-paper-faint">—</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
circle,
line {
  transition: fill 0.2s ease, stroke 0.2s ease;
}
</style>
