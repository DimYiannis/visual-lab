<script setup lang="ts">
/**
 * ChordLine — the straight-segment polyline that approximates arc length
 * (arclength mode). One fixed-size buffer for MAX_RECTS + 1 vertices;
 * `setDrawRange` limits drawing to the live segment count. Buffer is mutated
 * in place, never recreated. Violet = "derived math" design token.
 */
import * as THREE from 'three'
import { useWorkspaceStore, MAX_RECTS } from '~/stores/workspace'

const store = useWorkspaceStore()

const positions = new Float32Array((MAX_RECTS + 1) * 3)
const geometry = new THREE.BufferGeometry()
const positionAttr = new THREE.BufferAttribute(positions, 3)
positionAttr.setUsage(THREE.DynamicDrawUsage)
geometry.setAttribute('position', positionAttr)

const material = new THREE.LineBasicMaterial({ color: 0xc792ea }) // derived, full strength
const line = new THREE.Line(geometry, material)
line.frustumCulled = false
line.position.z = 0.01 // draw over the curve so the chords are readable

watch(
  [() => store.chordData, () => store.rectCount],
  ([data, n]) => {
    positions.set(data.subarray(0, positions.length))
    positionAttr.needsUpdate = true
    geometry.setDrawRange(0, n + 1)
  },
  { immediate: true },
)

onUnmounted(() => {
  // TresJS doesn't reliably detach <primitive> objects on unmount; without
  // this the chord polyline persists into other modes.
  line.removeFromParent()
  geometry.dispose()
  material.dispose()
})
</script>

<template>
  <primitive :object="line" />
</template>
