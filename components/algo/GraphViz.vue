<script setup lang="ts">
/**
 * Graph visualization (right panel) for the graph algorithms.
 *
 * Pure SVG, redrawn declaratively from the current trace step — graphs are
 * 8 nodes / ≤13 edges, so there is nothing to buffer. Layout comes from the
 * store (layered by longest path, so all edges point rightward).
 *
 * Color semantics follow the app: cyan = the node being processed now,
 * amber = the edge under consideration, violet = edges the algorithm has
 * committed to (tree / shortest-path parents), faded = consumed (Kahn cuts).
 * Green appears only on the finished order chips.
 */
import type { Graph, StepState } from '~/stores/algorithms'

const props = defineProps<{
  graph: Graph
  state: StepState
  frontierLabel: string
  orderLabel: string
  badgeLabel: string
  showWeights: boolean
}>()

const R = 20 // node radius in viewBox units

interface EdgeDraw {
  id: string
  d: string
  labelX: number
  labelY: number
  cls: string
  marker: string
}

function edgePath(x1: number, y1: number, x2: number, y2: number, bend: number): {
  d: string
  labelX: number
  labelY: number
} {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  // Shorten so the arrowhead lands on the circle's rim, not its center.
  const sx = x1 + ux * (R + 2)
  const sy = y1 + uy * (R + 2)
  const ex = x2 - ux * (R + 7)
  const ey = y2 - uy * (R + 7)
  if (bend === 0) {
    return { d: `M ${sx} ${sy} L ${ex} ${ey}`, labelX: (sx + ex) / 2, labelY: (sy + ey) / 2 - 6 }
  }
  // Long edges arc around intermediate columns.
  const mx = (sx + ex) / 2 - uy * bend
  const my = (sy + ey) / 2 + ux * bend
  return { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, labelX: mx, labelY: my - 4 }
}

const nodeById = computed(() => new Map(props.graph.nodes.map(n => [n.id, n])))

const edgeDraws = computed<EdgeDraw[]>(() =>
  props.graph.edges.map(e => {
    const a = nodeById.value.get(e.from)!
    const b = nodeById.value.get(e.to)!
    const long = Math.abs(b.x - a.x) > 180
    const bend = long ? ((e.from.charCodeAt(0) + e.to.charCodeAt(0)) % 2 === 0 ? 34 : -34) : 0
    const { d, labelX, labelY } = edgePath(a.x, a.y, b.x, b.y, bend)
    let cls = 'edge-default'
    let marker = 'url(#arrow-default)'
    if (props.state.activeEdge === e.id) {
      cls = 'edge-active'
      marker = 'url(#arrow-active)'
    } else if (props.state.cutEdges.includes(e.id)) {
      cls = 'edge-cut'
      marker = 'url(#arrow-cut)'
    } else if (props.state.treeEdges.includes(e.id)) {
      cls = 'edge-tree'
      marker = 'url(#arrow-tree)'
    }
    return { id: e.id, d, labelX, labelY, cls, marker }
  }),
)

function nodeClass(id: string): string {
  const s = props.state
  if (s.current === id) return 'node-current'
  if (s.frontier.some(f => f === id || f.startsWith(`${id}·`))) return 'node-frontier'
  if (s.order.includes(id)) return 'node-done'
  if (s.seen.includes(id)) return 'node-seen'
  return 'node-default'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <svg
      viewBox="0 0 640 400"
      class="min-h-0 w-full flex-1"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Graph being processed by the algorithm"
    >
      <defs>
        <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2A3A63" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FFB454" />
        </marker>
        <marker id="arrow-tree" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#C792EA" />
        </marker>
        <marker id="arrow-cut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2A3A63" opacity="0.15" />
        </marker>
      </defs>

      <!-- Edges under nodes -->
      <g>
        <g v-for="e in edgeDraws" :key="e.id">
          <path :d="e.d" fill="none" stroke-width="2" :class="e.cls" :marker-end="e.marker" />
          <text
            v-if="showWeights"
            :x="e.labelX"
            :y="e.labelY"
            text-anchor="middle"
            class="fill-paper-dim font-mono text-[12px]"
            :class="{ 'weight-active': state.activeEdge === e.id }"
          >
            {{ graph.edges.find(ge => ge.id === e.id)?.w }}
          </text>
        </g>
      </g>

      <!-- Nodes -->
      <g v-for="n in graph.nodes" :key="n.id">
        <circle :cx="n.x" :cy="n.y" :r="R" stroke-width="2" :class="nodeClass(n.id)" />
        <text
          :x="n.x"
          :y="n.y + 5"
          text-anchor="middle"
          class="pointer-events-none font-display text-[15px] font-semibold"
          :class="state.current === n.id ? 'fill-ink-950' : 'fill-paper'"
        >
          {{ n.id }}
        </text>
        <text
          v-if="badgeLabel && state.badges[n.id] !== undefined"
          :x="n.x"
          :y="n.y + R + 15"
          text-anchor="middle"
          class="font-mono text-[11px]"
          :class="state.badges[n.id] === '0' || state.badges[n.id] === '∞' ? 'fill-paper-faint' : 'fill-paper-dim'"
        >
          {{ state.badges[n.id] }}
        </text>
      </g>
    </svg>

    <!-- Data-structure readout: the queue/stack/pq and the output order -->
    <div class="space-y-1.5 px-1 pt-2">
      <div class="flex min-h-[26px] items-center gap-2">
        <span class="w-24 shrink-0 text-right font-display text-[11px] uppercase tracking-wider text-paper-faint">
          {{ frontierLabel }}
        </span>
        <TransitionGroup name="chip" tag="div" class="flex flex-wrap gap-1">
          <span
            v-for="(f, fi) in state.frontier"
            :key="`${fi}-${f}`"
            class="rounded border border-derived/40 bg-derived/10 px-1.5 py-0.5 font-mono text-[12px] text-derived"
          >
            {{ f }}
          </span>
        </TransitionGroup>
        <span v-if="!state.frontier.length" class="font-mono text-[12px] text-paper-faint">empty</span>
      </div>
      <div class="flex min-h-[26px] items-center gap-2">
        <span class="w-24 shrink-0 text-right font-display text-[11px] uppercase tracking-wider text-paper-faint">
          {{ orderLabel }}
        </span>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="o in state.order"
            :key="o"
            class="rounded border px-1.5 py-0.5 font-mono text-[12px] transition-colors"
            :class="state.done
              ? 'border-match/50 bg-match/10 text-match'
              : 'border-ink-600 bg-ink-800 text-paper'"
          >
            {{ o }}
          </span>
        </div>
        <span v-if="!state.order.length" class="font-mono text-[12px] text-paper-faint">—</span>
      </div>
      <p v-if="badgeLabel" class="pl-[104px] font-display text-[11px] text-paper-faint">
        number under each node = {{ badgeLabel }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.edge-default { stroke: #2a3a63; }
.edge-active { stroke: #ffb454; stroke-width: 3; }
.edge-tree { stroke: #c792ea; }
.edge-cut { stroke: #2a3a63; opacity: 0.15; }

.node-default { fill: #111a33; stroke: #55617f; }
.node-seen { fill: #111a33; stroke: #e8edf7; }
.node-frontier { fill: #111a33; stroke: #c792ea; stroke-width: 3; }
.node-current { fill: #4fd1ff; stroke: #4fd1ff; }
.node-done { fill: #0b1226; stroke: #2a3a63; }

.weight-active { fill: #ffb454; }

circle,
path {
  transition: stroke 0.2s ease, fill 0.2s ease, opacity 0.25s ease;
}

.chip-enter-active,
.chip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: translateY(3px);
}
</style>
