<script setup lang="ts">
/**
 * CurveLine — a THREE.Line backed by a fixed-size position buffer.
 *
 * Architecture rule: geometry updates mutate the existing buffer
 * (`needsUpdate = true`), we never recreate geometries or scenes.
 *
 * Two ways to feed it points:
 *  - reactive: pass a `points` prop (used by the static goal panel)
 *  - imperative: call `setPoints()` each frame (used by the animated live panel)
 */
import * as THREE from 'three'
import { SAMPLES } from '~/stores/workspace'

const props = withDefaults(
  defineProps<{
    points?: Float32Array | null
    color?: string
    opacity?: number
  }>(),
  {
    points: null,
    color: '#4FD1FF',
    opacity: 1,
  },
)

const positions = new Float32Array(SAMPLES * 3)
const geometry = new THREE.BufferGeometry()
const positionAttr = new THREE.BufferAttribute(positions, 3)
positionAttr.setUsage(THREE.DynamicDrawUsage)
geometry.setAttribute('position', positionAttr)
geometry.setDrawRange(0, SAMPLES)

const material = new THREE.LineBasicMaterial({
  color: new THREE.Color(props.color),
  transparent: props.opacity < 1,
  opacity: props.opacity,
})

const line = new THREE.Line(geometry, material)
line.frustumCulled = false // domain is clamped; skip per-frame culling math

function setPoints(next: Float32Array) {
  positions.set(next.subarray(0, positions.length))
  positionAttr.needsUpdate = true
}

watch(
  () => props.points,
  (next) => {
    if (next) setPoints(next)
  },
  { immediate: true },
)

watch(
  () => props.color,
  (next) => material.color.set(next),
)
watch(
  () => props.opacity,
  (next) => {
    material.transparent = next < 1
    material.opacity = next
  },
)

onUnmounted(() => {
  // TresJS doesn't reliably detach <primitive> objects on unmount.
  line.removeFromParent()
  geometry.dispose()
  material.dispose()
})

defineExpose({ setPoints })
</script>

<template>
  <primitive :object="line" />
</template>
