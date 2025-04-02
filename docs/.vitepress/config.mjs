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
      { text: 'Guides', link: '/guide/markdown-examples' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Examples',
          items: [
            { text: 'Markdown Examples', link: '/guide/markdown-examples' },
            { text: 'Runtime API Examples', link: '/guide/api-examples' }
          ]
        }
      ],
    },
    footer: {
      copyright: 'Copyright © 2025 Kitware Inc.'
    }
  }
})
