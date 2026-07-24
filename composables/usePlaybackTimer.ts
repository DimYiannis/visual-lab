import { useIntervalFn } from '@vueuse/core'

/**
 * Drives a playback ref with requestAnimationFrame-style ticking via
 * useIntervalFn. Presentation-only timing — the trace itself is exact
 * data; this just decides when to advance the pointer into it. Shared by
 * AlgoControls and ConcurrencyControls so the pacing rule lives in one
 * place.
 */
export function usePlaybackTimer(
  playing: Ref<boolean>,
  speed: Ref<number>,
  onTick: () => void,
  baseMs = 650,
) {
  const interval = computed(() => baseMs / speed.value)
  const { pause, resume } = useIntervalFn(onTick, interval, { immediate: false })
  watch(playing, p => (p ? resume() : pause()))
  onUnmounted(pause)
}
