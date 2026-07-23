<script setup lang="ts">
/**
 * GraphGrid — a subtle in-scene grid plus emphasized x/y axes.
 * Built once as a THREE.Group; nothing here is reactive.
 */
import * as THREE from 'three'
import { DOMAIN, Y_CLAMP } from '~/stores/workspace'

const group = new THREE.Group()

// Grid (GridHelper lies in XZ by default; rotate into the XY plane)
const size = DOMAIN[1] - DOMAIN[0]
const grid = new THREE.GridHelper(size, size, 0x243356, 0x141d38)
grid.rotation.x = Math.PI / 2
grid.position.z = -0.01
group.add(grid)

// Axes, slightly brighter than the grid (but still low-contrast on ink-950)
const axisMaterial = new THREE.LineBasicMaterial({ color: 0x40538a })

const xAxis = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(DOMAIN[0], 0, 0),
  new THREE.Vector3(DOMAIN[1], 0, 0),
])
const yAxis = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, -Y_CLAMP, 0),
  new THREE.Vector3(0, Y_CLAMP, 0),
])
group.add(new THREE.Line(xAxis, axisMaterial))
group.add(new THREE.Line(yAxis, axisMaterial))

onUnmounted(() => {
  // TresJS doesn't reliably detach <primitive> objects on unmount.
  group.removeFromParent()
  grid.geometry.dispose()
  ;(grid.material as THREE.Material).dispose()
  xAxis.dispose()
  yAxis.dispose()
  axisMaterial.dispose()
})
</script>

<template>
  <primitive :object="group" />
</template>
