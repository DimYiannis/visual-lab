<script setup lang="ts">
/**
 * RiemannRects — ALL rectangles as ONE InstancedMesh of a unit plane
 * (one draw call whether n = 4 or 400).
 *
 * Architecture rules honored:
 *  - buffers are fixed-size (MAX_RECTS instances allocated once); updates
 *    write instance matrices in place + `instanceMatrix.needsUpdate = true`
 *  - animation is presentation-only: displayed heights ease toward the
 *    store's exact `rectData` each frame, mirroring the curve lerp
 *  - negative-area rectangles get a different hue (teaches signed area)
 */
import * as THREE from 'three'
import { useRafFn, usePreferredReducedMotion } from '@vueuse/core'
import { useWorkspaceStore, MAX_RECTS } from '~/stores/workspace'

const store = useWorkspaceStore()
const reducedMotion = usePreferredReducedMotion()

const geometry = new THREE.PlaneGeometry(1, 1)
const material = new THREE.MeshBasicMaterial({
  color: 0xffffff, // white base so instance colors show unfiltered
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
})

const mesh = new THREE.InstancedMesh(geometry, material, MAX_RECTS)
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_RECTS * 3), 3)
mesh.count = 0
mesh.frustumCulled = false // domain is clamped; skip per-frame culling math

// Violet 'derived' for the approximation, so rectangles never blend into the
// cyan curve; pink keeps signed (below-axis) area unmistakable.
const POSITIVE = new THREE.Color('#C792EA')
const NEGATIVE = new THREE.Color('#FF6B81')

// Presentation-only easing state (never fed back into the store).
const displayedHeights = new Float32Array(MAX_RECTS)
const matrix = new THREE.Matrix4()

useRafFn(() => {
  const data = store.rectData
  const n = store.mode === 'integrate' ? store.rectCount : 0
  const width = store.rectWidth
  // Small inset keeps rectangles readable at low n; negligible at high n.
  const w = Math.max(width * 0.94, width - 0.05)
  const ease = reducedMotion.value === 'reduce' ? 1 : 0.22

  mesh.count = n
  for (let i = 0; i < n; i++) {
    const target = data[i * 2 + 1]
    const delta = target - displayedHeights[i]
    displayedHeights[i] = Math.abs(delta) > 1e-4 ? displayedHeights[i] + delta * ease : target
    const h = displayedHeights[i]

    matrix.makeScale(w, Math.max(Math.abs(h), 1e-4), 1)
    matrix.setPosition(data[i * 2], h / 2, -0.05) // just behind the curve
    mesh.setMatrixAt(i, matrix)
    mesh.setColorAt(i, h >= 0 ? POSITIVE : NEGATIVE)
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
})

onUnmounted(() => {
  // TresJS doesn't reliably detach <primitive> objects on unmount; without
  // this the rectangles persist into other modes.
  mesh.removeFromParent()
  geometry.dispose()
  material.dispose()
  mesh.dispose()
})
</script>

<template>
  <primitive :object="mesh" />
</template>
