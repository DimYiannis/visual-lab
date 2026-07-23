<script setup lang="ts">
import { useWorkspaceStore } from '~/stores/workspace'

const props = defineProps<{ name: string }>()
const store = useWorkspaceStore()

const param = computed(() => store.params[props.name])
const isHinted = computed(() => store.hint.param === props.name && !store.isMatched)

function onInput(event: Event) {
  store.setParam(props.name, Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <label
    v-if="param"
    class="block rounded-lg border px-3 py-2.5 transition-colors"
    :class="isHinted ? 'border-goal/60 bg-goal/5' : 'border-ink-700 bg-ink-800/60'"
  >
    <span class="mb-1.5 flex items-baseline justify-between">
      <span class="font-mono text-sm text-paper">
        {{ name }}
        <span v-if="isHinted" class="ml-1 text-[10px] uppercase tracking-wider text-goal">
          hint
        </span>
      </span>
      <span class="font-mono text-sm tabular-nums text-live">
        {{ param.value.toFixed(2) }}
      </span>
    </span>
    <input
      type="range"
      :min="param.min"
      :max="param.max"
      :step="param.step"
      :value="param.value"
      :aria-label="`Parameter ${name}`"
      @input="onInput"
    />
    <span class="mt-1 flex justify-between font-mono text-[10px] text-paper-faint">
      <span>{{ param.min }}</span>
      <span>{{ param.max }}</span>
    </span>
  </label>
</template>
