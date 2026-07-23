import type { Config } from 'tailwindcss'

/**
 * Design tokens — "night blueprint" direction.
 *
 * The whole app reads like engineering graph paper at night:
 * deep ink blues, a cyan "live" trace (like an oscilloscope),
 * and an amber "goal" trace. Green is reserved exclusively for
 * the matched/success state so it always means one thing.
 */
export default <Partial<Config>>{
  content: [],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080D1A', // app background
          900: '#0B1226', // panel background
          800: '#111A33', // raised surfaces / inputs
          700: '#1B2747', // borders
          600: '#2A3A63', // strong borders / grid major
        },
        paper: {
          DEFAULT: '#E8EDF7', // primary text
          dim: '#8A96B3', // secondary text
          faint: '#55617F', // tertiary / labels
        },
        live: '#4FD1FF', // current curve (cyan trace)
        goal: '#FFB454', // target curve (amber trace)
        match: '#7CFFB2', // success only
        derived: '#C792EA', // derived math: f' trace, tangent line, chord polyline
        danger: '#FF6B81',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(42,58,99,0.6), 0 12px 40px rgba(0,0,0,0.35)',
        glowLive: '0 0 18px rgba(79,209,255,0.35)',
        glowMatch: '0 0 18px rgba(124,255,178,0.4)',
      },
    },
  },
}
