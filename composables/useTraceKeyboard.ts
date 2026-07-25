/**
 * Space = play/pause, ←/→ = step. Shared by the Algorithm Lab and
 * Concurrency Lab pages — both are just "a store with stepForward/
 * stepBack/togglePlay", so one composable covers both. Ignored while focus
 * is on a form control (the algorithm/scenario/speed <select>s, any future
 * input) so it never hijacks normal interaction with them.
 */
interface TraceStore {
  togglePlay: () => void
  stepForward: () => void
  stepBack: () => void
}

const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA'])

export function useTraceKeyboard(store: TraceStore) {
  function onKey(e: KeyboardEvent) {
    const target = e.target
    if (target instanceof HTMLElement && FORM_TAGS.has(target.tagName)) return

    if (e.code === 'Space') {
      e.preventDefault()
      store.togglePlay()
    } else if (e.code === 'ArrowRight') {
      e.preventDefault()
      store.stepForward()
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault()
      store.stepBack()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onUnmounted(() => window.removeEventListener('keydown', onKey))
}
