<script setup lang="ts">
/** Thin wrapper: the actual highlighter lives in the shared PySourcePanel. */
import { useAlgoStore } from '~/stores/algorithms'
import PySourcePanel from '~/components/shared/PySourcePanel.vue'

const store = useAlgoStore()
const currentLine = computed(() => store.step?.line ?? 0)
</script>

<template>
  <PySourcePanel :code="store.algo.code" :current-line="currentLine" />
</template>
