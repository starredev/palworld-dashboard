# Authentication & roles

Tsuki Panel has a bootstrap admin password that always works, plus optional Discord OAuth with role-based access.

## Roles

| Role | Can |
| --- | --- |
| **admin** | Everything: server commands, config, schedules, backups, and the save editor |
| **viewer** | Read-only: view dashboards, players, map, logs — but no mutating actions |

The UI hides admin-only controls (server controls, config actions, kick/ban, save editor) from viewers, and the API enforces it: every mutating route requires the admin role.

## Bootstrap admin password

Always available, so you're **never locked out**:

```bash
AUTH_PASSWORD=your-strong-password   # required — compose won't start without it
JWT_SECRET=<long-random-string>      # required, min 16 chars — signs the session
COOKIE_NAME=tsuki_session            # optional
SESSION_TTL=7d                       # optional session lifetime
```

Sign in with this password from the login page. The session is an HTTP-only cookie signed with `JWT_SECRET`.

::: tip
Generate a secret with `openssl rand -hex 32`. Set `COOKIE_SECURE=true` once you're on [HTTPS](/installation/https).
:::

## Discord OAuth (optional)

Let people sign in with Discord and grant roles by their Discord **rank** (role) or user id.

### 1. Create a Discord app

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. Under **OAuth2**, add a **redirect** that matches your `DISCORD_REDIRECT_URI` exactly, e.g. `https://panel.example.com/api/auth/discord/callback`.
3. Copy the **Client ID** and **Client Secret**.

### 2. Configure the panel

```bash
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=https://panel.example.com/api/auth/discord/callback
DISCORD_GUILD_ID=987654321098765432   # your Discord server id (required for roles)
```

### 3. Choose who gets in, and who's admin

**By role (recommended):**

```bash
# Members with an admin ROLE get full access; everyone else allowed = viewer.
DISCORD_ADMIN_ROLE_IDS=111111111111111111
# Optional: ONLY members with one of these roles may sign in at all.
# Leave empty to let any guild member sign in as a viewer.
DISCORD_ALLOWED_ROLE_IDS=222222222222222222
```

**By user id (extra / fallback, combined with the above):**

```bash
DISCORD_ALLOWED_IDS=111111111111111111,222222222222222222
DISCORD_ADMIN_IDS=111111111111111111
```

::: warning Fail-closed by design
If **neither** a guild nor an id allowlist is set, Discord login is **refused** — so a misconfiguration can never accidentally let the whole internet in. The password admin always still works.
:::

### Redirect URI gotcha

A common mistake is a **double slash** in the redirect (`https://panel.example.com//api/...`). It must match the Discord app registration character-for-character, and use your `https://` domain in production.
