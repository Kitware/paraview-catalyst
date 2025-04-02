import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/paraview-catalyst",
  title: "ParaView/Catalyst",
  description: "ParaView/Catalyst documentation",
  lastUpdated: true,
  head: [
    ['link', { rel: "apple-touch-icon", sizes: "196x196", href: "/paraview-catalyst/logos/favicon-196x196.png"}],
    ['link', { rel: "icon", type: "image/png", sizes: "32x32", href: "/paraview-catalyst/logos/favicon-32x32.png"}],
    ['link', { rel: "icon", type: "image/png", sizes: "16x16", href: "/paraview-catalyst/logos/favicon-16x16.png"}],
    [
      'script',
      { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-S0P6NWR8Y9' }
    ],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];
       function gtag(){dataLayer.push(arguments);}
       gtag('js', new Date());
       gtag('config', 'G-S0P6NWR8Y9');`
    ],
  ],
  themeConfig: {
    search: {
      provider: 'local'
    },
    logo: '/logo.png',
    siteTitle: false,
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guides', link: '/guide/concepts' },
      { text: 'Use Cases', link: '/usecase/' },
      {
        text: 'Resources',
        items: [
          { text: 'API', link: 'https://trame.readthedocs.io/en/latest/index.html' },
          { text: 'Discussions', link: 'https://github.com/Kitware/trame/discussions' },
          { text: 'Bugs', link: 'https://github.com/Kitware/trame/issues' },
          { text: 'Services', link: 'https://www.kitware.com/trame/' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Concepts', link: '/guide/concepts' },
            { text: 'Getting started', link: '/guide/getting-started' }
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'C', link: '/guide/example-c' },
            { text: 'Fortran 90', link: '/guide/example-fortran' },
            { text: 'Python', link: '/guide/example-python' },
            { text: 'C++', link: '/guide/example-cxx' },
          ]
        },
        {
          text: 'Extract types',
          items: [
            { text: 'Images', link: '/guide/example-image' },
            { text: 'Meshes', link: '/guide/example-mesh' },
          ]
        },
      ],
      '/usecase/': [
        {
          text: 'National laboratories',
          items: [
            { text: 'Los Alamos', link: '/usecase/lanl' },
            { text: 'Berkley', link: '/usecase/berkley' }
          ]
        },
        {
          text: 'Industry',
          items: [
            { text: 'XXX', link: '/usecase/xxx' },
          ]
        },
      ],
    },
    footer: {
      copyright: 'Copyright © 2025 Kitware Inc.'
    }
  }
})
