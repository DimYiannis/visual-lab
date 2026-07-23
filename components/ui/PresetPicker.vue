<script setup lang="ts">
/**
 * PresetPicker — load a famous equation into the workspace. Selecting one
 * replaces the expression; sliders regenerate automatically from its symbols
 * (that invariant is the whole trick). Each preset carries a one-line
 * real-world blurb for context.
 */
import { useWorkspaceStore, PRESETS } from '~/stores/workspace'

const store = useWorkspaceStore()

const selected = computed(
  () => PRESETS.find((p) => p.expression === store.expression) ?? null,
)

function onChange(event: Event) {
  const label = (event.target as HTMLSelectElement).value
  const preset = PRESETS.find((p) => p.label === label)
  if (preset) store.loadPreset(preset)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <select
      class="rounded-md border border-ink-700 bg-ink-800 px-2 py-1 font-display text-xs text-paper-dim outline-none transition-colors hover:border-ink-600 focus:border-live"
      aria-label="Load a famous equation"
      :value="selected?.label ?? ''"
      @change="onChange"
    >
      <option value="" disabled>Famous equations…</option>
      <option v-for="p in PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
    </select>
    <p v-if="selected" class="font-display text-[11px] leading-snug text-paper-faint">
      {{ selected.blurb }}
    </p>
  </div>
</template>
