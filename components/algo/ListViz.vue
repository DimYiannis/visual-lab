<script setup lang="ts">
/**
 * Linked-list visualization. Slots are fixed boxes (nodes never move in
 * memory) — only the `next` arrows change. Forward arrows run above the
 * boxes, backward (already-reversed) arrows run below in violet, the arrow
 * being rewired flashes amber, and prev/curr/nxt markers ride under their
 * slots. A null next shows as ∅.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{ state: StepState }>()

const BOX_W = 72
const BOX_H = 46
const GAP = 30
const Y = 120

function boxX(i: number): number {
  const n = props.state.listValues.length
  const total = n * BOX_W + (n - 1) * GAP
  return (640 - total) / 2 + i * (BOX_W + GAP)
}

interface Arrow {
  key: string
  d: string
  cls: string
  marker: string
}

const arrows = computed<Arrow[]>(() =>
  props.state.listNext
    .map((t, i) => {
      if (t === null) return null
      const active = props.state.listActive === i
      let d: string
      if (t > i) {
        // forward: straight through the gap
        d = `M ${boxX(i) + BOX_W} ${Y + BOX_H / 2} L ${boxX(t) - 7} ${Y + BOX_H / 2}`
      } else {
        // backward: arc underneath
        const x1 = boxX(i) + BOX_W / 2
        const x2 = boxX(t) + BOX_W / 2
        d = `M ${x1} ${Y + BOX_H} Q ${(x1 + x2) / 2} ${Y + BOX_H + 58} ${x2} ${Y + BOX_H + 8}`
      }
      const cls = active ? 'stroke-goal' : t < i ? 'stroke-derived' : 'stroke-ink-600'
      const marker = active ? 'url(#list-arrow-active)' : t < i ? 'url(#list-arrow-tree)' : 'url(#list-arrow-default)'
      return { key: `${i}`, d, cls, marker }
    })
    .filter((a): a is Arrow => a !== null),
)

/** Slots whose next is null (∅ tag) — at most head-being-flipped + old tail. */
const nullNext = computed(() =>
  props.state.listNext.map((t, i) => (t === null ? i : -1)).filter(i => i >= 0),
)

const markerRows = computed(() => {
  const byIndex: Record<number, string[]> = {}
  for (const [name, idx] of Object.entries(props.state.cursors)) (byIndex[idx] ??= []).push(name)
  return byIndex
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col justify-center">
    <svg
      viewBox="0 0 640 300"
      class="min-h-0 w-full flex-1"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Linked list with pointer arrows"
    >
      <defs>
        <marker id="list-arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2A3A63" />
        </marker>
        <marker id="list-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FFB454" />
        </marker>
        <marker id="list-arrow-tree" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#C792EA" />
        </marker>
      </defs>

      <path
        v-for="a in arrows"
        :key="a.key"
        :d="a.d"
        fill="none"
        stroke-width="2.5"
        :class="a.cls"
        :marker-end="a.marker"
      />

      <g v-for="(v, i) in state.listValues" :key="i">
        <rect
          :x="boxX(i)"
          :y="Y"
          :width="BOX_W"
          :height="BOX_H"
          rx="6"
          stroke-width="2"
          :class="[
            state.done ? 'stroke-match' : state.listActive === i ? 'stroke-goal' : 'stroke-ink-600',
            'fill-ink-800',
          ]"
        />
        <text
          :x="boxX(i) + BOX_W / 2"
          :y="Y + BOX_H / 2 + 5"
          text-anchor="middle"
          class="font-mono text-[15px] fill-paper"
        >
          {{ v }}
        </text>
        <!-- ∅ = this node currently points nowhere -->
        <text
          v-if="nullNext.includes(i)"
          :x="boxX(i) + BOX_W + 10"
          :y="Y - 8"
          class="font-mono text-[13px] fill-paper-faint"
        >
          ∅
        </text>
        <!-- prev / curr / nxt markers -->
        <text
          v-if="markerRows[i]"
          :x="boxX(i) + BOX_W / 2"
          :y="Y - 16"
          text-anchor="middle"
          class="font-mono text-[12px] font-medium fill-goal"
        >
          {{ markerRows[i].join(' · ') }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
path,
rect {
  transition: stroke 0.2s ease, opacity 0.2s ease;
}
</style>
