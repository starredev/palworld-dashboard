import { defineConfig } from 'vitepress'

// Docs site for Tsuki Panel. `base` is '/' — serve at a domain root or behind
// your own nginx. For a GitHub Pages *project* site, set base to
// '/palworld-dashboard/' (or use a custom domain / CNAME and keep '/').
export default defineConfig({
  title: 'Tsuki Panel',
  description: 'The all-in-one control panel for your Palworld server — docs, installation and feature reference.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  base: '/',

  // localhost URLs in the dev guide aren't reachable at build time — that's fine.
  ignoreDeadLinks: [/^https?:\/\/localhost/],

  themeConfig: {
    logo: '🌙',

    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Installation', link: '/installation/prerequisites' },
      { text: 'Features', link: '/features/overview' },
      { text: 'Reference', link: '/reference/environment-variables' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/starredev/palworld-dashboard' },
          { text: 'Report an issue', link: 'https://github.com/starredev/palworld-dashboard/issues' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Architecture', link: '/guide/architecture' },
          { text: 'How the save editor works', link: '/guide/save-editor-internals' },
        ],
      },
      {
        text: 'Installation',
        collapsed: false,
        items: [
          { text: 'Prerequisites', link: '/installation/prerequisites' },
          { text: 'Local development', link: '/installation/local-development' },
          { text: 'Deploy with Docker', link: '/installation/docker' },
          { text: 'Connect your Palworld server', link: '/installation/connect-server' },
          { text: 'Live config, backups & save editing', link: '/installation/data-mount' },
          { text: 'Guilds, Pals & live map', link: '/installation/gamedata' },
          { text: 'HTTPS', link: '/installation/https' },
        ],
      },
      {
        text: 'Features',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/features/overview' },
          { text: 'Monitoring & players', link: '/features/monitoring' },
          { text: 'Server config editor', link: '/features/server-config' },
          { text: 'Schedules & profiles', link: '/features/schedules' },
          { text: 'Backups', link: '/features/backups' },
          { text: 'Map, Guilds, Pals & Paldeck', link: '/features/world' },
          { text: 'Crafting planner', link: '/features/crafting' },
          { text: 'Save editor', link: '/features/save-editor' },
        ],
      },
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'Authentication & roles', link: '/reference/authentication' },
          { text: 'Environment variables', link: '/reference/environment-variables' },
          { text: 'Managing the deployment', link: '/reference/operations' },
          { text: 'Troubleshooting', link: '/reference/troubleshooting' },
          { text: 'FAQ', link: '/reference/faq' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/starredev/palworld-dashboard' }],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/starredev/palworld-dashboard/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Tsuki Panel — an open-source Palworld management platform.',
    },
  },
})
