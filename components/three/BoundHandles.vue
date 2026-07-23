<script setup lang="ts">
/**
 * BoundHandles — the two draggable integration bounds (p and q) as vertical
 * lines with a grip dot on the x-axis. Visual only: pointer/drag logic lives
 * in LivePanel (Visualization → Store direction), this component just mirrors
 * store.boundP / store.boundQ by mutating group positions — nothing is
 * recreated on update.
 */
import * as THREE from 'three'
import { useWorkspaceStore, Y_CLAMP } from '~/stores/workspace'

const store = useWorkspaceStore()

const root = new THREE.Group()

// Neutral paper-dim: handles are interactive chrome, distinct from every
// curve color (cyan curve, violet apparatus, amber goal) but deliberately
// low-contrast against the dark panel — grips stay findable, lines recede.
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x8a96b3,
  transparent: true,
  opacity: 0.5,
})
const gripMaterial = new THREE.MeshBasicMaterial({ color: 0x8a96b3 })
const gripGeometry = new THREE.CircleGeometry(0.16, 24)

const lineGeometries: THREE.BufferGeometry[] = []

function makeHandle(): THREE.Group {
  const group = new THREE.Group()
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -Y_CLAMP, 0),
    new THREE.Vector3(0, Y_CLAMP, 0),
  ])
  lineGeometries.push(geo)
  group.add(new THREE.Line(geo, lineMaterial))
  const grip = new THREE.Mesh(gripGeometry, gripMaterial)
  grip.position.z = 0.01
  group.add(grip)
  root.add(group)
  return group
}

const handleP = makeHandle()
const handleQ = makeHandle()

watch(
  () => store.boundP,
  (x) => { handleP.position.x = x },
  { immediate: true },
)
watch(
  () => store.boundQ,
  (x) => { handleQ.position.x = x },
  { immediate: true },
)

onUnmounted(() => {
  // Detach from the scene explicitly — TresJS does not reliably remove
  // <primitive> objects on unmount, and a disposed-but-attached object
  // keeps rendering (apparatus would leak across mode switches).
  root.removeFromParent()
  lineGeometries.forEach((g) => g.dispose())
  gripGeometry.dispose()
  lineMaterial.dispose()
  gripMaterial.dispose()
})
</script>

<template>
  <primitive :object="root" />
</template>
