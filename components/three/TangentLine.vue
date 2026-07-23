<script setup lang="ts">
/**
 * TangentLine — the tangent at the probe point plus a grab dot (derive mode).
 *
 * The line spans the whole domain with slope f′(x₀) through (x₀, f(x₀)).
 * Fixed 2-point buffer mutated in place; the dot is a small circle mesh whose
 * position is updated, never recreated. Violet = "derived math" (see design
 * tokens) — the same hue as the f′ trace it belongs to.
 */
import * as THREE from 'three'
import { useWorkspaceStore, DOMAIN } from '~/stores/workspace'

const store = useWorkspaceStore()

const group = new THREE.Group()

const positions = new Float32Array(2 * 3)
const geometry = new THREE.BufferGeometry()
const positionAttr = new THREE.BufferAttribute(positions, 3)
positionAttr.setUsage(THREE.DynamicDrawUsage)
geometry.setAttribute('position', positionAttr)

const lineMaterial = new THREE.LineBasicMaterial({ color: 0xc792ea }) // derived, full strength
const line = new THREE.Line(geometry, lineMaterial)
line.frustumCulled = false
group.add(line)

const dotGeometry = new THREE.CircleGeometry(0.18, 24)
const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xc792ea })
const dot = new THREE.Mesh(dotGeometry, dotMaterial)
dot.position.z = 0.02
group.add(dot)

watch(
  [() => store.probeX, () => store.probeY, () => store.probeSlope],
  ([x0, y0, m]) => {
    positions[0] = DOMAIN[0]
    positions[1] = y0 + m * (DOMAIN[0] - x0)
    positions[3] = DOMAIN[1]
    positions[4] = y0 + m * (DOMAIN[1] - x0)
    positionAttr.needsUpdate = true
    dot.position.x = x0
    dot.position.y = y0
  },
  { immediate: true },
)

onUnmounted(() => {
  // TresJS doesn't reliably detach <primitive> objects on unmount; without
  // this the tangent + probe dot persist into other modes.
  group.removeFromParent()
  geometry.dispose()
  dotGeometry.dispose()
  lineMaterial.dispose()
  dotMaterial.dispose()
})
</script>

<template>
  <primitive :object="group" />
</template>
