// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // SPA first — no server rendering, WebGL lives entirely in the client
  ssr: false,

  modules: [
    '@tresjs/nuxt',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss',
  ],

  css: [
    'katex/dist/katex.min.css',
    '~/assets/css/main.css',
  ],

  tres: {
    // TresJS devtools integration (safe to leave on in dev)
    devtools: true,
  },

  app: {
    head: {
      title: 'Visual Math Workspace',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'An interactive math workspace where symbolic input, sliders and 3D visuals stay in sync.',
        },
      ],
    },
  },

  compatibilityDate: '2024-11-01',
})
