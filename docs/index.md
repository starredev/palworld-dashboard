---
layout: home

hero:
  name: Tsuki Panel
  text: One control panel for your Palworld server
  tagline: Monitor it, configure it, and deep-edit the save — all from one fast, self-hosted dashboard.
  actions:
    - theme: brand
      text: Get started
      link: /installation/prerequisites
    - theme: alt
      text: What is Tsuki Panel?
      link: /guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/starredev/palworld-dashboard

features:
  - icon: 🖥️
    title: Monitoring & players
    details: Live status, metrics history, online/offline players with kick & ban, server logs and an activity feed.
    link: /features/monitoring
  - icon: ⚙️
    title: Config & operations
    details: Edit the real PalWorldSettings.ini from the browser, schedule restarts and weekly config events, snapshot and restore backups.
    link: /features/server-config
  - icon: 🗺️
    title: World, pals & crafting
    details: A coordinate map of players, bases and roaming pals, a full Paldeck, and a recursive crafting planner.
    link: /features/world
  - icon: 🛠️
    title: A safe save editor
    details: Teleport, edit players, pals, guilds and inventories — queued, previewed and applied in one restart with an automatic backup.
    link: /features/save-editor
  - icon: 🔒
    title: Self-hosted & private
    details: One port, no cross-origin, same-origin cookies. Bootstrap admin password plus optional Discord OAuth with roles.
    link: /reference/authentication
  - icon: 🧩
    title: Typed & tested
    details: A pnpm monorepo, typed end-to-end with TypeScript + Zod, tested with Vitest, and Dockerized for a one-command deploy.
    link: /guide/architecture
---

## New here?

1. **[Prerequisites](/installation/prerequisites)** — what you need before you start.
2. **[Deploy with Docker](/installation/docker)** — the recommended one-command install for a server.
3. **[Connect your Palworld server](/installation/connect-server)** — REST and/or RCON so the panel shows live data.
4. **[Enable save editing](/installation/data-mount)** — mount the game data to unlock the deep editors.

Prefer to poke around locally first? See **[Local development](/installation/local-development)**.
