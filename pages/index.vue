<script setup lang="ts">
import LivePanel from '~/components/panels/LivePanel.vue'
import GoalPanel from '~/components/panels/GoalPanel.vue'
import WorkspacePanel from '~/components/panels/WorkspacePanel.vue'
</script>

<template>
  <main class="mx-auto flex h-full max-w-7xl flex-col gap-3 p-3 sm:p-4">
    <header class="flex items-baseline justify-between px-1">
      <h1 class="font-display text-lg font-700 tracking-tight text-paper">
        Visual Math <span class="text-live">Workspace</span>
      </h1>
      <div class="flex items-baseline gap-4">
        <p class="hidden font-display text-xs text-paper-faint sm:block">
          Move a slider. Watch the curve. Match the goal.
        </p>
        <NuxtLink
          to="/algorithms"
          class="font-display text-xs text-paper-dim transition-colors hover:text-live"
        >
          Algorithm Lab →
        </NuxtLink>
        <NuxtLink
          to="/structures"
          class="font-display text-xs text-paper-dim transition-colors hover:text-live"
        >
          Data structures →
        </NuxtLink>
        <NuxtLink
          to="/concurrency"
          class="font-display text-xs text-paper-dim transition-colors hover:text-live"
        >
          Concurrency →
        </NuxtLink>
      </div>
    </header>

    <!-- Top: live (left) + goal (right); Bottom: symbolic workspace -->
    <div class="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
      <LivePanel />
      <GoalPanel />
    </div>

    <WorkspacePanel />
  </main>
</template>
