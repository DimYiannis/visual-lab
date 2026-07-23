/**
 * useGraphView — shared pan/zoom state for the graph cameras.
 *
 * Presentation-only (architecture rule: the store holds math truth, never
 * view state). The state is module-level so the live and goal panels always
 * show the same viewport — comparing curves stays a one-glance operation.
 *
 * The cameras stay axis-aligned (looking straight down −z at the z = 0
 * plane), so pointer unprojection remains plain trig — no raycaster.
 */
import { reactive } from 'vue'

export const GRAPH_FOV = 60

const HOME: { x: number; y: number; z: number } = { x: 0, y: 0, z: 13 }
const Z_MIN = 4
const Z_MAX = 30
const PAN_LIMIT = 12

const view = reactive({ ...HOME })

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Half the visible world height at the z = 0 plane for a camera at `z`. */
function halfHeightAt(z: number) {
  return Math.tan((GRAPH_FOV * Math.PI) / 360) * z
}

export function useGraphView() {
  /** Convert a pointer event to world coordinates on the z = 0 plane. */
  function pointerToWorld(event: PointerEvent | WheelEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    const halfH = halfHeightAt(view.z)
    const halfW = halfH * (rect.width / rect.height)
    return { x: view.x + ndcX * halfW, y: view.y + ndcY * halfH }
  }

  /** World units per screen pixel at the current zoom (for pixel-based panning). */
  function worldPerPixel(el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    if (rect.height === 0) return 0
    return (2 * halfHeightAt(view.z)) / rect.height
  }

  /** Zoom by a factor, keeping the world point under the cursor fixed. */
  function zoomAt(factor: number, event: WheelEvent, el: HTMLElement) {
    const before = pointerToWorld(event, el)
    view.z = clamp(view.z * factor, Z_MIN, Z_MAX)
    if (!before) return
    const after = pointerToWorld(event, el)
    if (!after) return
    view.x = clamp(view.x + (before.x - after.x), -PAN_LIMIT, PAN_LIMIT)
    view.y = clamp(view.y + (before.y - after.y), -PAN_LIMIT, PAN_LIMIT)
  }

  function panBy(dxWorld: number, dyWorld: number) {
    view.x = clamp(view.x + dxWorld, -PAN_LIMIT, PAN_LIMIT)
    view.y = clamp(view.y + dyWorld, -PAN_LIMIT, PAN_LIMIT)
  }

  function reset() {
    Object.assign(view, HOME)
  }

  const isHome = computed(
    () => view.x === HOME.x && view.y === HOME.y && view.z === HOME.z,
  )

  return { view, pointerToWorld, worldPerPixel, zoomAt, panBy, reset, isHome }
}
