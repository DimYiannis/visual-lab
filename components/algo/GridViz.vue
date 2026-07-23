<script setup lang="ts">
/**
 * DP table visualization (0/1 knapsack). A plain HTML grid — the table IS
 * the data structure here, no positions to compute. Cyan = the cell being
 * filled, amber = the cell(s) it reads from (the recurrence, made visible),
 * violet = on the backtraced optimal path once filling is done.
 */
import type { StepState } from '~/stores/algorithms'

const props = defineProps<{ state: StepState }>()

function isSource(r: number, c: number): boolean {
  return props.state.gridSource.some(([sr, sc]) => sr === r && sc === c)
}
function isOnPath(r: number, c: number): boolean {
  return props.state.gridPath.some(([pr, pc]) => pr === r && pc === c)
}

function cellClass(r: number, c: number, v: number): string {
  const active = props.state.gridActive
  if (active && active[0] === r && active[1] === c) return 'border-live bg-live/20 text-live'
  if (state.value.done && isOnPath(r, c)) return 'border-derived bg-derived/15 text-derived'
  if (isSource(r, c)) return 'border-goal bg-goal/15 text-goal'
  if (v === -1) return 'border-ink-700 bg-ink-900 text-paper-faint'
  return 'border-ink-600 bg-ink-800 text-paper'
}

const state = computed(() => props.state)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-2 pt-2">
    <div class="flex items-center gap-2 pb-1">
      <span class="font-display text-[11px] uppercase tracking-wider text-paper-faint">capacity →</span>
    </div>
    <div class="min-w-0 overflow-x-auto">
      <table class="border-separate" style="border-spacing: 3px">
        <thead>
          <tr>
            <th class="w-24" />
            <th
              v-for="(c, ci) in state.gridColLabels"
              :key="ci"
              class="min-w-[34px] pb-1 text-center font-mono text-[11px] font-normal text-paper-faint"
            >
              {{ c }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in state.gridValues" :key="ri">
            <th class="whitespace-nowrap pr-2 text-right font-mono text-[11px] font-normal text-paper-faint">
              {{ state.gridRowLabels[ri] }}
            </th>
            <td
              v-for="(v, ci) in row"
              :key="ci"
              class="min-w-[34px] rounded border px-1 py-1.5 text-center font-mono text-[12px] transition-colors"
              :class="cellClass(ri, ci, v)"
            >
              {{ v === -1 ? '·' : v }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex min-h-[26px] flex-wrap items-center gap-1.5 border-t border-ink-700/60 pt-2">
      <span class="pr-1 font-display text-[11px] uppercase tracking-wider text-paper-faint">chosen</span>
      <span
        v-for="(item, i) in state.order"
        :key="i"
        class="rounded border px-1.5 py-0.5 font-mono text-[12px] transition-colors"
        :class="state.done ? 'border-match/50 bg-match/10 text-match' : 'border-derived/40 bg-derived/10 text-derived'"
      >
        {{ item }}
      </span>
      <span v-if="!state.order.length" class="font-mono text-[12px] text-paper-faint">—</span>
    </div>
  </div>
</template>
