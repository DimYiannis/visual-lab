# Visual Math Workspace

An interactive visual mathematics workspace inspired by GeoGebra, focused on real-time understanding and guided problem solving. Every mathematical change has an immediate, intuitive visual effect.

**MVP:** match a target parabola. `f(x) = a(x − h)² + k`, sliders for `a`, `h`, `k`, an animated live curve, an amber goal curve, and one visual-first hint at a time.

## Five paradigms

Each mode is one famous mathematical idea, with its own visual, a live formula readout, a goal to chase, and a one-line lesson in plain words:

| Mode | Idea | Visual | Goal |
|---|---|---|---|
| **Match** | Transformations — symbols move curves | live curve vs ghost target | match the target curve |
| **Area ∫** | Riemann sums → the integral | rectangles melt into the region as `n` grows; signed area tinted | enclose an area of X |
| **Slope d⁄dx** | The derivative is local slope | f′ as a second trace + draggable tangent probe | hit a target slope |
| **Series Σ** | Taylor series rebuild functions from powers | partial-sum polynomial hugs the true curve term by term | converge to the function |
| **Length** | Arc length = the limit of chord sums | straight segments straighten into the curve | match a target length |

In area/length modes drag the `p`/`q` bounds directly on the graph; the Riemann/chord approximation, the "exact" value (composite Simpson's rule), and the shrinking error are always visible — the limit definition made physical. The series mode includes bases with a finite radius of convergence (geometric, ln(1+x)), so you can watch divergence with your own eyes.

**Famous equations:** a preset picker loads classics — parabola, sine wave, Gaussian bell curve, logistic growth, cubic — each with a one-line real-world blurb. Sliders regenerate automatically from whatever symbols the preset uses.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Nuxt 3 (SPA, `ssr: false`) |
| State | Pinia — single source of truth |
| 3D | three.js via TresJS (`@tresjs/nuxt`) |
| Math | mathjs (parse/compile/evaluate, LaTeX export) |
| Notation | KaTeX |
| Reactivity helpers | VueUse (`watchThrottled`, `refDebounced`, `useRafFn`) |
| Styling | Tailwind CSS |

## Architecture

```
Equation input ──▶
                   Pinia store (stores/workspace.ts) ──▶ Visualization panels
Sliders ────────▶
```

- **The store owns all math.** It compiles the expression (once per edit, not per frame), discovers free symbols, generates slider definitions from them, samples both curves into flat `Float32Array`s, and computes the match score and the current hint.
- **Visuals never store math logic.** Panels read `currentPoints` / `targetPoints` from the store and draw them. `CurveLine.vue` owns a fixed-size position buffer and mutates it in place (`needsUpdate = true`) — geometries are never recreated.
- **Animation is presentation-only.** `LivePanel.vue` eases the displayed y-values toward the store's sampled points each frame (`useRafFn`), so parameter changes feel physical. The store's data is always the exact truth; the easing is purely visual. The same pattern drives the Riemann rectangles: instance heights ease toward the store's exact values.
- **View state is presentation too.** Pan/zoom lives in `composables/useGraphView.ts` (module-level, shared), never in the store. Both panels share one viewport, so comparing curves stays a one-glance operation. Cameras stay axis-aligned looking down −z at the z = 0 plane, which keeps pointer → world unprojection plain trig (no raycaster).

### Performance guidelines applied

- Math evaluation is **throttled** (~33 ms) while sliders move; expression re-compilation is **debounced** (250 ms) while typing.
- Fixed sampling resolution (`SAMPLES = 240`) and clamped domain/range (`DOMAIN = [-8, 8]`, `Y_CLAMP = 9`).
- One `BufferGeometry` per curve for the lifetime of the component, `DynamicDrawUsage`, frustum culling skipped (domain is clamped anyway).
- All Riemann rectangles are **one `InstancedMesh`** of a unit plane — one draw call whether `n` is 4 or 400. Instance matrices are written in place (`instanceMatrix.needsUpdate = true`); nothing is recreated when `n` changes.
- `requestAnimationFrame` (via `useRafFn`) drives the easing loop; `prefers-reduced-motion` snaps instead of easing.

### Auto-generated sliders

The store walks the parsed mathjs tree, collects every `SymbolNode` that isn't `x` (or a constant like `pi`/`e`, or a function name), and creates a slider per symbol. Try changing the equation to `a * sin(b * x) + k` — sliders appear and disappear to match.

## Project layout

```
stores/workspace.ts          # single source of truth: expression, params, target,
                             # sampling, match score, hints, LaTeX, all five modes
                             # (Riemann sums, derivative, Taylor series, arc length),
                             # MODES/PRESETS/SERIES catalogues with educational copy
composables/useGraphView.ts  # shared pan/zoom camera state (presentation-only)
components/
  panels/LivePanel.vue       # top-left: animated live curve, per-mode overlays,
                             # formula readout, pan/zoom/handle dragging
  panels/GoalPanel.vue       # top-right: non-interactive target, hint, match meter
  panels/WorkspacePanel.vue  # bottom: mode switcher + lesson strip, equation editor,
                             # KaTeX, presets, auto sliders, per-mode controls
  three/CurveLine.vue        # THREE.Line over a mutable fixed-size buffer
  three/GraphGrid.vue        # grid + axes group
  three/RiemannRects.vue     # ONE InstancedMesh for all rectangles
  three/BoundHandles.vue     # p/q integration-bound handle visuals
  three/TangentLine.vue      # tangent line + draggable probe dot (derive mode)
  three/ChordLine.vue        # chord polyline (arclength mode)
  ui/ParamSlider.vue         # one auto-generated slider
  ui/MatchMeter.vue          # closeness gauge
  ui/IntegrateControls.vue   # method picker + n slider + bounds readout
  ui/SeriesControls.vue      # series base picker + N-terms slider
  ui/PresetPicker.vue        # famous-equation dropdown with context blurbs
pages/index.vue              # three-panel layout
assets/css/main.css          # graph-paper texture, slider styling, fonts
```

## Controls

- **Wheel** over the live panel: zoom toward the cursor
- **Drag**: pan (both panels share the viewport)
- **Double-click** (or the *reset view* chip): back to the home view
- **Area / Length modes**: drag the vertical `p`/`q` handles to move the bounds; the cursor switches to ↔ near a handle
- **Slope mode**: drag the violet dot along the curve to move the tangent probe

## Design notes

The visual direction is "night blueprint": panels read like engineering graph paper, the live curve is a cyan oscilloscope trace, the goal is amber, violet marks derived math (f′, tangent, chords), and green appears *only* when matched — color always means one thing. Strictly one diagram at a time: the live panel shows your curve plus only the active paradigm's apparatus (rectangles, tangent, chords) — the goal panel holds the target, hint, and meter. Nothing overlays anything else.

## Deliberately out of scope (for now)

Authentication, backend/database, AI tutoring, symbolic algebra steps, multi-user. Priority: clarity, performance, intuition.

## Future extensions

- Calculus: ✅ area (Riemann sums), ✅ derivative + tangent, ✅ Taylor series, ✅ arc length. Next: Fourier partial sums, slope fields
- Surfaces `z = f(x, y)` — the TresJS scene is already 3D; swap the line buffer for a plane buffer
- Vector/matrix visualization
- Drag-the-curve interaction (visualization → store direction of the data flow)
- AI-assisted hints
