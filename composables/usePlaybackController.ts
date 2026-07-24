/**
 * Shared playback state machine for both trace-and-scrub stores (Algorithm
 * Lab, Concurrency Lab). Called once inside each store's setup() — the
 * refs it returns become part of that store, so callers still just see
 * `store.stepIndex`, `store.playing`, etc. Pure state; the interval that
 * actually advances it lives in `usePlaybackTimer` (presentation, not
 * store — same "animation is presentation-only" rule as the math side).
 */
export function usePlaybackController(traceLength: () => number) {
  const stepIndex = ref(0)
  const playing = ref(false)
  const speed = ref(1)

  const atEnd = computed(() => stepIndex.value >= traceLength() - 1)

  function restart() {
    playing.value = false
    stepIndex.value = 0
  }

  function stepForward() {
    if (atEnd.value) {
      playing.value = false
      return
    }
    stepIndex.value += 1
  }

  function stepBack() {
    playing.value = false
    if (stepIndex.value > 0) stepIndex.value -= 1
  }

  function seek(i: number) {
    playing.value = false
    stepIndex.value = Math.min(Math.max(0, Math.round(i)), traceLength() - 1)
  }

  function togglePlay() {
    if (!playing.value && atEnd.value) stepIndex.value = 0
    playing.value = !playing.value
  }

  return { stepIndex, playing, speed, atEnd, restart, stepForward, stepBack, seek, togglePlay }
}
