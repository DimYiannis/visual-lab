import { defineStore, acceptHMRUpdate } from 'pinia'
import { parse, type EvalFunction, type MathNode } from 'mathjs'
import { watchThrottled } from '@vueuse/core'

/* ---------------------------------------------------------------------------
 * Constants — sampling resolution and clamped domain (performance guideline:
 * fixed buffer sizes, clamped domain and range).
 * ------------------------------------------------------------------------ */
export const SAMPLES = 240
export const DOMAIN: readonly [number, number] = [-8, 8]
export const Y_CLAMP = 9

/** Riemann module: rectangle count is clamped so instance buffers stay fixed-size. */
export const MAX_RECTS = 400
/** Minimum gap kept between the integration bounds p and q. */
export const BOUND_GAP = 0.5
/** |exact − target| tolerance for an area match. */
const AREA_TOLERANCE = 0.15

export type WorkspaceMode = 'match' | 'integrate' | 'derive' | 'series' | 'arclength'
export type RiemannMethod = 'left' | 'right' | 'midpoint' | 'trapezoid'
export type SeriesBase = 'sin' | 'cos' | 'exp' | 'geometric' | 'log'

/** Central-difference step for numeric derivatives. */
const DERIV_H = 1e-3
/** Max Taylor terms (factorials stay well inside double precision). */
export const MAX_TERMS = 15

/* ---------------------------------------------------------------------------
 * Mode catalogue — each paradigm carries its own educational copy.
 * `tagline` = a few descriptive words; `lesson` = the one idea to take away.
 * ------------------------------------------------------------------------ */
export interface ModeInfo {
  value: WorkspaceMode
  label: string
  tagline: string
  lesson: string
}

export const MODES: ModeInfo[] = [
  {
    value: 'match',
    label: 'Match',
    tagline: 'Transformations',
    lesson:
      'Every symbol moves the curve: a stretches, h shifts, k lifts. Algebra is geometry in disguise.',
  },
  {
    value: 'integrate',
    label: 'Area ∫',
    tagline: 'Riemann sums → the integral',
    lesson:
      'The integral is the limit of rectangle sums. Crank n and watch the approximation melt into the exact area. Signed: below the axis counts negative.',
  },
  {
    value: 'derive',
    label: 'Slope d⁄dx',
    tagline: 'The derivative',
    lesson:
      'The derivative is slope at a point. Drag the dot along the curve: the tangent shows what the curve looks like up close — every smooth curve is locally straight.',
  },
  {
    value: 'series',
    label: 'Series Σ',
    tagline: 'Taylor series',
    lesson:
      'A Taylor series rebuilds a function from powers of x. Each term hugs the true curve a little longer — but only inside the radius of convergence.',
  },
  {
    value: 'arclength',
    label: 'Length',
    tagline: 'Arc length',
    lesson:
      'Straighten the curve: sum the chords √(Δx² + Δy²). More segments fit closer — the limit is the exact length ∫√(1 + f′²) dx.',
  },
]

/* ---------------------------------------------------------------------------
 * Famous equations — loadable presets. Sliders auto-generate from the
 * symbols (invariant: sliders are discovered, never hardcoded).
 * ------------------------------------------------------------------------ */
export interface PresetInfo {
  label: string
  expression: string
  blurb: string
}

export const PRESETS: PresetInfo[] = [
  {
    label: 'Parabola',
    expression: 'a * (x - h)^2 + k',
    blurb: 'Projectile paths, satellite dishes — the simplest curve with a turning point.',
  },
  {
    label: 'Sine wave',
    expression: 'a * sin(b * x) + k',
    blurb: 'Sound, light, tides — everything that oscillates.',
  },
  {
    label: 'Gaussian',
    expression: 'a * e^(-(x - h)^2 / (2 * s^2))',
    blurb: 'The bell curve — measurement errors, heights, noise. Statistics runs on it.',
  },
  {
    label: 'Logistic',
    expression: 'a / (1 + e^(-b * (x - h)))',
    blurb: 'Growth with a ceiling — populations, epidemics, neural activations.',
  },
  {
    label: 'Cubic',
    expression: 'a * x^3 + b * x + k',
    blurb: 'The first curve with an inflection point — where the bending flips direction.',
  },
]

/* ---------------------------------------------------------------------------
 * Taylor series catalogue (series mode). Coefficients are analytic — numeric
 * high-order derivatives of arbitrary expressions are too noisy to teach with.
 * ------------------------------------------------------------------------ */
const FACT: number[] = [1]
for (let i = 1; i <= 2 * MAX_TERMS + 2; i++) FACT[i] = FACT[i - 1] * i

export interface SeriesDef {
  label: string
  texName: string
  /** Radius of convergence (null = entire real line). */
  radius: number | null
  blurb: string
  trueFn: (x: number) => number
  /** Value of term k (k starts at `kStart`). */
  term: (k: number, x: number) => number
  kStart: number
  /** Sigma-notation LaTeX for the partial sum up to `kEnd`. */
  texSum: (kEnd: number) => string
}

export const SERIES: Record<SeriesBase, SeriesDef> = {
  sin: {
    label: 'sin x',
    texName: '\\sin x',
    radius: null,
    blurb: 'Odd powers only — the wave is built from x, x³, x⁵…',
    trueFn: Math.sin,
    term: (k, x) => ((k % 2 === 0 ? 1 : -1) * x ** (2 * k + 1)) / FACT[2 * k + 1],
    kStart: 0,
    texSum: (kEnd) => `\\sum_{k=0}^{${kEnd}} \\frac{(-1)^k\\,x^{2k+1}}{(2k+1)!}`,
  },
  cos: {
    label: 'cos x',
    texName: '\\cos x',
    radius: null,
    blurb: 'Even powers only — starts at 1 and bends down with −x²/2.',
    trueFn: Math.cos,
    term: (k, x) => ((k % 2 === 0 ? 1 : -1) * x ** (2 * k)) / FACT[2 * k],
    kStart: 0,
    texSum: (kEnd) => `\\sum_{k=0}^{${kEnd}} \\frac{(-1)^k\\,x^{2k}}{(2k)!}`,
  },
  exp: {
    label: 'eˣ',
    texName: 'e^{x}',
    radius: null,
    blurb: 'The function that is its own derivative — every term is the last one integrated.',
    trueFn: Math.exp,
    term: (k, x) => x ** k / FACT[k],
    kStart: 0,
    texSum: (kEnd) => `\\sum_{k=0}^{${kEnd}} \\frac{x^{k}}{k!}`,
  },
  geometric: {
    label: '1⁄(1−x)',
    texName: '\\frac{1}{1-x}',
    radius: 1,
    blurb: 'The geometric series — the mother of all summations. Watch it diverge past |x| = 1.',
    trueFn: (x) => 1 / (1 - x),
    term: (k, x) => x ** k,
    kStart: 0,
    texSum: (kEnd) => `\\sum_{k=0}^{${kEnd}} x^{k}`,
  },
  log: {
    label: 'ln(1+x)',
    texName: '\\ln(1+x)',
    radius: 1,
    blurb: 'Alternating harmonic flavor — converges only on (−1, 1].',
    trueFn: (x) => Math.log(1 + x),
    term: (k, x) => ((k % 2 === 1 ? 1 : -1) * x ** k) / k,
    kStart: 1,
    texSum: (kEnd) => `\\sum_{k=1}^{${kEnd}} \\frac{(-1)^{k+1}\\,x^{k}}{k}`,
  },
}

/** Symbols that should never become sliders. */
const RESERVED = new Set(['x', 'e', 'E', 'pi', 'PI', 'tau', 'phi', 'i', 'Infinity', 'NaN'])

export interface Param {
  value: number
  min: number
  max: number
  step: number
}

export interface HintInfo {
  param: string | null
  text: string
}

/** Sensible slider defaults for a freshly discovered symbol. */
function defaultParam(name: string): Param {
  if (name === 'a') return { value: 1, min: -3, max: 3, step: 0.1 }
  if (name === 'b') return { value: 1, min: -5, max: 5, step: 0.1 }
  if (name === 's') return { value: 1, min: 0.2, max: 3, step: 0.05 } // width-like (Gaussian σ)
  return { value: 0, min: -5, max: 5, step: 0.1 }
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step
}

function clampY(y: number): number {
  if (!Number.isFinite(y)) return 0
  return Math.min(Y_CLAMP, Math.max(-Y_CLAMP, y))
}

/**
 * Sample any numeric function over the fixed domain into a flat
 * [x, y, z, x, y, z, ...] Float32Array, ready for a three.js position buffer.
 */
function sampleFn(fn: (x: number) => number): Float32Array {
  const pts = new Float32Array(SAMPLES * 3)
  const [x0, x1] = DOMAIN
  for (let i = 0; i < SAMPLES; i++) {
    const x = x0 + (i / (SAMPLES - 1)) * (x1 - x0)
    pts[i * 3] = x
    pts[i * 3 + 1] = clampY(fn(x))
    pts[i * 3 + 2] = 0
  }
  return pts
}

/** Sample the compiled expression (clamped) over the fixed domain. */
function samplePoints(compiled: EvalFunction | null, values: Record<string, number>): Float32Array {
  const scope: Record<string, number> = { ...values, x: 0 }
  return sampleFn((x) => evaluateAt(compiled, x, scope))
}

/** Taylor partial sum with `terms` terms of the given base series. */
function partialSum(base: SeriesBase, terms: number, x: number): number {
  const def = SERIES[base]
  let sum = 0
  for (let k = def.kStart; k < def.kStart + terms; k++) sum += def.term(k, x)
  return sum
}

/** Evaluate the compiled expression at x. Unclamped (areas need true values); non-finite → 0. */
function evaluateAt(compiled: EvalFunction | null, x: number, scope: Record<string, number>): number {
  if (!compiled) return 0
  scope.x = x
  try {
    const result = compiled.evaluate(scope)
    const y = typeof result === 'number' ? result : Number(result)
    return Number.isFinite(y) ? y : 0
  } catch {
    return 0
  }
}

/**
 * "Exact" reference integral via composite Simpson's rule at high resolution.
 * Numeric on purpose — mathjs has no symbolic integration (see CLAUDE.md).
 */
function simpsonNumeric(fn: (x: number) => number, a: number, b: number): number {
  const M = 1024 // even; plenty for smooth curves on a clamped domain
  const h = (b - a) / M
  let sum = fn(a) + fn(b)
  for (let i = 1; i < M; i++) {
    sum += fn(a + i * h) * (i % 2 === 1 ? 4 : 2)
  }
  return (sum * h) / 3
}

function simpsonIntegral(
  compiled: EvalFunction | null,
  a: number,
  b: number,
  values: Record<string, number>,
): number {
  const scope: Record<string, number> = { ...values, x: 0 }
  return simpsonNumeric((x) => evaluateAt(compiled, x, scope), a, b)
}

/** Central-difference slope of the compiled expression at x. */
function numericSlope(compiled: EvalFunction | null, x: number, scope: Record<string, number>): number {
  const m =
    (evaluateAt(compiled, x + DERIV_H, scope) - evaluateAt(compiled, x - DERIV_H, scope)) /
    (2 * DERIV_H)
  return Number.isFinite(m) ? m : 0
}

export const useWorkspaceStore = defineStore('workspace', () => {
  /* -------------------------------------------------------------------------
   * Symbolic state
   * ---------------------------------------------------------------------- */
  const expression = ref('a * (x - h)^2 + k')
  const parseError = ref<string | null>(null)

  /** Auto-generated sliders: one entry per free symbol in the expression. */
  const params = reactive<Record<string, Param>>({})

  /** The goal the user is trying to reach (same symbols as `params`). */
  const target = reactive<Record<string, number>>({})

  /* -------------------------------------------------------------------------
   * Integrate mode (Riemann sums) state
   * ---------------------------------------------------------------------- */
  const mode = ref<WorkspaceMode>('match')
  const boundP = ref(-2)
  const boundQ = ref(3)
  /** Rectangle count (integrate) / segment count (arclength). */
  const rectCount = ref(16)
  const method = ref<RiemannMethod>('left')
  /** Goal in integrate mode: enclose this signed area. null until first generated. */
  const targetArea = ref<number | null>(null)

  /* Derive mode: tangent probe position + goal slope. */
  const probeX = ref(1)
  const targetSlope = ref<number | null>(null)

  /* Series mode: which famous series, how many terms. */
  const seriesBase = ref<SeriesBase>('sin')
  const seriesTerms = ref(1)

  /* Arclength mode: goal length. */
  const targetLength = ref<number | null>(null)

  /** Non-reactive compiled function + parsed tree (perf: recompiled only on expression change). */
  let compiled: EvalFunction | null = null
  let parsedNode: MathNode | null = null

  function compileExpression() {
    try {
      const node = parse(expression.value)
      compiled = node.compile()
      parsedNode = node
      parseError.value = null
      syncParamsFromExpression(node)
    } catch (err) {
      parseError.value = err instanceof Error ? err.message : 'Could not parse the expression'
      // Keep the last valid compiled function so visuals never go blank.
    }
  }

  /** Discover free symbols and keep `params` / `target` in sync with them. */
  function syncParamsFromExpression(node: MathNode) {
    const symbols = new Set<string>()
    node.traverse((child, _path, parent) => {
      const c = child as MathNode & { isSymbolNode?: boolean; name?: string }
      const p = parent as (MathNode & { type?: string; fn?: unknown }) | null
      const isFunctionName = p?.type === 'FunctionNode' && (p as { fn?: unknown }).fn === child
      if (c.isSymbolNode && c.name && !RESERVED.has(c.name) && !isFunctionName) {
        symbols.add(c.name)
      }
    })

    for (const name of symbols) {
      if (!(name in params)) params[name] = defaultParam(name)
      if (!(name in target)) target[name] = randomInRange(params[name])
    }
    for (const name of Object.keys(params)) {
      if (!symbols.has(name)) {
        delete params[name]
        delete target[name]
      }
    }
  }

  function randomInRange(p: Param): number {
    const raw = p.min + Math.random() * (p.max - p.min)
    return Number(roundToStep(raw, p.step * 5).toFixed(4))
  }

  /* -------------------------------------------------------------------------
   * Derived values
   * ---------------------------------------------------------------------- */
  const paramNames = computed(() => Object.keys(params))

  const currentValues = computed<Record<string, number>>(() => {
    const out: Record<string, number> = {}
    for (const [name, p] of Object.entries(params)) out[name] = p.value
    return out
  })

  /**
   * Sampled points. `currentPoints` is throttled (sliders fire continuously),
   * `targetPoints` only changes when a new goal is set.
   */
  const currentPoints = shallowRef<Float32Array>(new Float32Array(SAMPLES * 3))
  const targetPoints = shallowRef<Float32Array>(new Float32Array(SAMPLES * 3))

  function recomputeCurrent() {
    // Series mode: the "current" curve is the Taylor partial sum.
    currentPoints.value =
      mode.value === 'series'
        ? sampleFn((x) => partialSum(seriesBase.value, seriesTerms.value, x))
        : samplePoints(compiled, currentValues.value)
  }
  function recomputeTarget() {
    // Series mode: the goal is the true function the series converges to.
    targetPoints.value =
      mode.value === 'series'
        ? sampleFn(SERIES[seriesBase.value].trueFn)
        : samplePoints(compiled, { ...target })
  }

  /* -------------------------------------------------------------------------
   * Riemann sum + exact area (integrate mode)
   *
   * `rectData` is flat [centerX, height, centerX, height, ...] — heights are
   * clamped for display; both areas use the true (unclamped) values so the
   * approximation visibly converges to the exact integral as n grows.
   * ---------------------------------------------------------------------- */
  const rectData = shallowRef<Float32Array>(new Float32Array(MAX_RECTS * 2))
  const approxArea = ref(0)
  const exactArea = ref(0)

  const rectWidth = computed(() => (boundQ.value - boundP.value) / rectCount.value)

  function recomputeIntegral() {
    if (mode.value !== 'integrate') return
    const p = boundP.value
    const q = boundQ.value
    const n = rectCount.value
    const values = currentValues.value
    const scope: Record<string, number> = { ...values, x: 0 }
    const w = (q - p) / n
    const buf = new Float32Array(MAX_RECTS * 2)

    let sum = 0
    for (let i = 0; i < n; i++) {
      const left = p + i * w
      const right = left + w
      let h: number
      switch (method.value) {
        case 'left':
          h = evaluateAt(compiled, left, scope)
          break
        case 'right':
          h = evaluateAt(compiled, right, scope)
          break
        case 'midpoint':
          h = evaluateAt(compiled, (left + right) / 2, scope)
          break
        case 'trapezoid':
          // Rendered as a rectangle of the trapezoid's mean height (same area,
          // keeps the single-InstancedMesh invariant).
          h = (evaluateAt(compiled, left, scope) + evaluateAt(compiled, right, scope)) / 2
          break
      }
      sum += h * w
      buf[i * 2] = left + w / 2
      buf[i * 2 + 1] = Math.min(Y_CLAMP, Math.max(-Y_CLAMP, h))
    }

    approxArea.value = sum
    exactArea.value = simpsonIntegral(compiled, p, q, values)
    rectData.value = buf
  }

  /* -------------------------------------------------------------------------
   * Derivative trace + tangent probe (derive mode)
   * ---------------------------------------------------------------------- */
  const derivativePoints = shallowRef<Float32Array>(new Float32Array(SAMPLES * 3))
  const probeY = ref(0)
  const probeSlope = ref(0)

  function recomputeDerive() {
    if (mode.value !== 'derive') return
    const scope: Record<string, number> = { ...currentValues.value, x: 0 }
    derivativePoints.value = sampleFn((x) => numericSlope(compiled, x, scope))
    probeSlope.value = numericSlope(compiled, probeX.value, scope)
    probeY.value = clampY(evaluateAt(compiled, probeX.value, scope))
  }

  /* -------------------------------------------------------------------------
   * Chord polyline + arc length (arclength mode)
   *
   * `chordData` holds n+1 vertices [x, y, z, ...]; display y is clamped,
   * lengths use true values so the approximation converges to the exact
   * integral ∫ √(1 + f′²) dx.
   * ---------------------------------------------------------------------- */
  const chordData = shallowRef<Float32Array>(new Float32Array((MAX_RECTS + 1) * 3))
  const approxLength = ref(0)
  const exactLength = ref(0)

  function recomputeArclength() {
    if (mode.value !== 'arclength') return
    const p = boundP.value
    const q = boundQ.value
    const n = rectCount.value
    const scope: Record<string, number> = { ...currentValues.value, x: 0 }
    const w = (q - p) / n
    const buf = new Float32Array((MAX_RECTS + 1) * 3)

    let sum = 0
    let prevY = evaluateAt(compiled, p, scope)
    buf[0] = p
    buf[1] = clampY(prevY)
    for (let i = 1; i <= n; i++) {
      const x = p + i * w
      const y = evaluateAt(compiled, x, scope)
      sum += Math.hypot(w, y - prevY)
      prevY = y
      buf[i * 3] = x
      buf[i * 3 + 1] = clampY(y)
    }

    approxLength.value = sum
    exactLength.value = simpsonNumeric(
      (x) => Math.hypot(1, numericSlope(compiled, x, scope)),
      p,
      q,
    )
    chordData.value = buf
  }

  function recomputeModeExtras() {
    recomputeIntegral()
    recomputeDerive()
    recomputeArclength()
  }

  // Throttled evaluation (performance guideline) — ~30fps worth of math.
  watchThrottled(currentValues, recomputeCurrent, { throttle: 33, trailing: true })
  watchThrottled(
    [currentValues, boundP, boundQ, rectCount, method, probeX],
    recomputeModeExtras,
    { throttle: 33, trailing: true },
  )
  // Series controls re-sample both curves (they ARE the curves in series mode).
  watchThrottled(
    [seriesBase, seriesTerms],
    () => {
      recomputeCurrent()
      recomputeTarget()
    },
    { throttle: 33, trailing: true },
  )
  watch(() => ({ ...target }), recomputeTarget, { deep: true })
  watch(expression, () => {
    compileExpression()
    recomputeCurrent()
    recomputeTarget()
    recomputeModeExtras()
  })
  watch(mode, (next) => {
    recomputeCurrent()
    recomputeTarget()
    recomputeModeExtras()
    // First visit to a goal-number mode: generate its target.
    if (
      (next === 'integrate' && targetArea.value === null) ||
      (next === 'derive' && targetSlope.value === null) ||
      (next === 'arclength' && targetLength.value === null)
    ) {
      newTarget()
    }
  })

  /* -------------------------------------------------------------------------
   * Match score & hints
   * ---------------------------------------------------------------------- */
  const areaError = computed(() =>
    targetArea.value === null ? Infinity : Math.abs(exactArea.value - targetArea.value),
  )
  const slopeError = computed(() =>
    targetSlope.value === null ? Infinity : Math.abs(probeSlope.value - targetSlope.value),
  )
  const lengthError = computed(() =>
    targetLength.value === null ? Infinity : Math.abs(exactLength.value - targetLength.value),
  )
  /** Mean |Δy| between the current and target curves (series mode fit). */
  const curveError = computed(() => {
    const a = currentPoints.value
    const b = targetPoints.value
    let sum = 0
    for (let i = 1; i < a.length; i += 3) sum += Math.abs(a[i] - b[i])
    return sum / SAMPLES
  })

  function errorScore(error: number, scale: number): number {
    return Math.max(0, 1 - Math.min(error / scale, 1))
  }

  const matchScore = computed(() => {
    if (mode.value === 'integrate') {
      if (targetArea.value === null) return 0
      return errorScore(areaError.value, Math.max(Math.abs(targetArea.value), 4))
    }
    if (mode.value === 'derive') {
      if (targetSlope.value === null) return 0
      return errorScore(slopeError.value, Math.max(Math.abs(targetSlope.value), 2))
    }
    if (mode.value === 'arclength') {
      if (targetLength.value === null) return 0
      return errorScore(lengthError.value, Math.max(targetLength.value, 4))
    }
    if (mode.value === 'series') {
      return errorScore(curveError.value, 2)
    }
    const names = paramNames.value
    if (names.length === 0) return 0
    let total = 0
    for (const name of names) {
      const p = params[name]
      const range = Math.max(p.max - p.min, 1e-9)
      const diff = Math.abs(p.value - (target[name] ?? 0)) / range
      total += Math.min(diff, 1)
    }
    return Math.max(0, 1 - total / names.length)
  })

  const isMatched = computed(() => {
    if (mode.value === 'integrate') return areaError.value <= AREA_TOLERANCE
    if (mode.value === 'derive') return slopeError.value <= 0.15
    if (mode.value === 'arclength') return lengthError.value <= 0.15
    if (mode.value === 'series') return curveError.value <= 0.1
    return paramNames.value.every((name) => {
      const p = params[name]
      return Math.abs(p.value - (target[name] ?? 0)) <= p.step * 1.5
    })
  })

  /** One visual-first hint: point at the single most-off parameter. */
  const hint = computed<HintInfo>(() => {
    if (mode.value === 'integrate') {
      if (isMatched.value) return { param: null, text: 'Area matched. Try a new target!' }
      if (targetArea.value === null) return { param: null, text: '' }
      const needMore = targetArea.value > exactArea.value
      return {
        param: null,
        text: needMore
          ? 'More area — raise the curve or widen the bounds'
          : 'Less area — lower the curve or pull the bounds in',
      }
    }
    if (mode.value === 'derive') {
      if (isMatched.value) return { param: null, text: 'Slope matched. Try a new target!' }
      if (targetSlope.value === null) return { param: null, text: '' }
      return {
        param: null,
        text:
          targetSlope.value > probeSlope.value
            ? 'Tilt up — drag the dot or reshape the curve for a steeper climb'
            : 'Tilt down — drag the dot or reshape the curve to descend',
      }
    }
    if (mode.value === 'series') {
      if (isMatched.value) return { param: null, text: 'Converged — the polynomial hugs the curve!' }
      const def = SERIES[seriesBase.value]
      if (def.radius !== null && seriesTerms.value >= 8) {
        return {
          param: null,
          text: `Notice the edges: outside |x| < ${def.radius} no number of terms converges`,
        }
      }
      return { param: null, text: 'Add terms — each one hugs the true curve a little longer' }
    }
    if (mode.value === 'arclength') {
      if (isMatched.value) return { param: null, text: 'Length matched. Try a new target!' }
      if (targetLength.value === null) return { param: null, text: '' }
      return {
        param: null,
        text:
          targetLength.value > exactLength.value
            ? 'Longer — steepen the curve or widen the bounds'
            : 'Shorter — flatten the curve or pull the bounds in',
      }
    }
    if (isMatched.value) return { param: null, text: 'Matched. Try a new target!' }

    let worst: string | null = null
    let worstDiff = 0
    for (const name of paramNames.value) {
      const p = params[name]
      const range = Math.max(p.max - p.min, 1e-9)
      const diff = Math.abs(p.value - (target[name] ?? 0)) / range
      if (diff > worstDiff) {
        worstDiff = diff
        worst = name
      }
    }
    if (!worst) return { param: null, text: '' }

    const p = params[worst]
    const t = target[worst] ?? 0
    const direction = t > p.value ? 'Increase' : 'Decrease'

    // Friendly phrasing for the quadratic MVP, generic fallback otherwise.
    const flavours: Record<string, string> = {
      a:
        Math.sign(t) !== Math.sign(p.value) && t !== 0 && p.value !== 0
          ? 'Flip the parabola — a should change sign'
          : `${direction} a to make it ${Math.abs(t) > Math.abs(p.value) ? 'narrower' : 'wider'}`,
      h: `${direction === 'Increase' ? 'Shift right' : 'Shift left'} — adjust h`,
      k: `${direction === 'Increase' ? 'Move it up' : 'Move it down'} — adjust k`,
    }
    return { param: worst, text: flavours[worst] ?? `${direction} ${worst}` }
  })

  /* -------------------------------------------------------------------------
   * Actions
   * ---------------------------------------------------------------------- */
  function setParam(name: string, value: number) {
    const p = params[name]
    if (!p) return
    p.value = Math.min(p.max, Math.max(p.min, value))
  }

  function setExpression(next: string) {
    expression.value = next
  }

  function setBound(which: 'p' | 'q', value: number) {
    if (!Number.isFinite(value)) return
    if (which === 'p') {
      boundP.value = Math.min(Math.max(value, DOMAIN[0]), boundQ.value - BOUND_GAP)
    } else {
      boundQ.value = Math.max(Math.min(value, DOMAIN[1]), boundP.value + BOUND_GAP)
    }
  }

  function setRectCount(n: number) {
    rectCount.value = Math.min(MAX_RECTS, Math.max(1, Math.round(n)))
  }

  function setMethod(next: RiemannMethod) {
    method.value = next
  }

  function setMode(next: WorkspaceMode) {
    mode.value = next
  }

  function setProbe(x: number) {
    if (!Number.isFinite(x)) return
    probeX.value = Math.min(DOMAIN[1], Math.max(DOMAIN[0], x))
  }

  function setSeriesBase(base: SeriesBase) {
    seriesBase.value = base
  }

  function setSeriesTerms(n: number) {
    seriesTerms.value = Math.min(MAX_TERMS, Math.max(1, Math.round(n)))
  }

  function loadPreset(preset: PresetInfo) {
    expression.value = preset.expression
  }

  /** Random slider values — used to generate goals that are always reachable. */
  function randomValues(): Record<string, number> {
    const values: Record<string, number> = {}
    for (const name of paramNames.value) values[name] = randomInRange(params[name])
    return values
  }

  function newTarget() {
    if (mode.value === 'integrate') {
      // Target = exact area of a random-but-achievable curve over the current
      // bounds, so every goal is reachable with the sliders alone.
      let next = exactArea.value
      let guard = 0
      while (Math.abs(next - exactArea.value) < AREA_TOLERANCE * 4 && guard++ < 12) {
        next = simpsonIntegral(compiled, boundP.value, boundQ.value, randomValues())
      }
      targetArea.value = Number(next.toFixed(1))
      return
    }
    if (mode.value === 'derive') {
      // Target slope: sampled from a random achievable curve at a random x.
      let next = probeSlope.value
      let guard = 0
      while (Math.abs(next - probeSlope.value) < 0.6 && guard++ < 12) {
        const scope: Record<string, number> = { ...randomValues(), x: 0 }
        const x = DOMAIN[0] / 2 + Math.random() * (DOMAIN[1] - DOMAIN[0]) * 0.5
        next = numericSlope(compiled, x, scope)
      }
      targetSlope.value = Number(next.toFixed(1))
      return
    }
    if (mode.value === 'arclength') {
      let next = exactLength.value
      let guard = 0
      while (Math.abs(next - exactLength.value) < 0.6 && guard++ < 12) {
        const scope: Record<string, number> = { ...randomValues(), x: 0 }
        next = simpsonNumeric(
          (x) => Math.hypot(1, numericSlope(compiled, x, scope)),
          boundP.value,
          boundQ.value,
        )
      }
      targetLength.value = Number(next.toFixed(1))
      return
    }
    if (mode.value === 'series') {
      // New target = a different famous series, back to one term.
      const bases = Object.keys(SERIES) as SeriesBase[]
      const others = bases.filter((b) => b !== seriesBase.value)
      seriesBase.value = others[Math.floor(Math.random() * others.length)]
      seriesTerms.value = 1
      return
    }
    for (const name of paramNames.value) {
      const p = params[name]
      let next = randomInRange(p)
      // Make sure the new goal is visibly different from where the user is now.
      let guard = 0
      while (Math.abs(next - p.value) < p.step * 4 && guard++ < 12) {
        next = randomInRange(p)
      }
      target[name] = next
    }
  }

  /** LaTeX for the symbolic expression and for the substituted (numeric) form. */
  const latex = computed(() => {
    if (!parsedNode) return ''
    try {
      return parsedNode.toTex({ parenthesis: 'auto' })
    } catch {
      return ''
    }
  })

  const latexSubstituted = computed(() => {
    if (!parsedNode) return ''
    // touch currentValues so this recomputes with the sliders
    const values = currentValues.value
    try {
      const substituted = parsedNode.transform((child) => {
        const c = child as MathNode & { isSymbolNode?: boolean; name?: string }
        if (c.isSymbolNode && c.name && c.name in values) {
          return parse(String(Number(values[c.name].toFixed(2))))
        }
        return child
      })
      return substituted.toTex({ parenthesis: 'auto' })
    } catch {
      return ''
    }
  })

  /* -------------------------------------------------------------------------
   * Init
   * ---------------------------------------------------------------------- */
  compileExpression()
  recomputeCurrent()
  recomputeTarget()

  return {
    // state
    expression,
    parseError,
    params,
    target,
    mode,
    boundP,
    boundQ,
    rectCount,
    method,
    targetArea,
    probeX,
    targetSlope,
    seriesBase,
    seriesTerms,
    targetLength,
    // derived
    paramNames,
    currentValues,
    currentPoints,
    targetPoints,
    rectData,
    rectWidth,
    approxArea,
    exactArea,
    areaError,
    derivativePoints,
    probeY,
    probeSlope,
    slopeError,
    chordData,
    approxLength,
    exactLength,
    lengthError,
    curveError,
    matchScore,
    isMatched,
    hint,
    latex,
    latexSubstituted,
    // actions
    setParam,
    setExpression,
    newTarget,
    setBound,
    setRectCount,
    setMethod,
    setMode,
    setProbe,
    setSeriesBase,
    setSeriesTerms,
    loadPreset,
  }
})

// Keep the dev-server store instance in sync when this file is hot-reloaded
// (otherwise components import the new module while Pinia serves the old
// store instance and the UI silently desyncs).
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWorkspaceStore, import.meta.hot))
}
