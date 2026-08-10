# HTTPS

For production, serve the panel over HTTPS. Sessions use cookies, so this protects your login.

## Recommended: terminate TLS in front

Put a reverse proxy in front of the panel and point it at `HTTP_PORT`:

- **Caddy** — automatic Let's Encrypt certificates, simplest.
- **Traefik** — great if you already run it.
- **nginx + certbot** — classic and reliable.

A minimal Caddy example (`Caddyfile`):

```text
panel.example.com {
    reverse_proxy localhost:80
}
```

(Replace `80` with your `HTTP_PORT` if you changed it.)

## Then flip the secure cookie flag

Once the panel is reachable over `https://`, tell it to mark the session cookie `Secure`:

```bash
# in .env
COOKIE_SECURE=true
```

Restart to apply:

```bash
docker compose up -d
```

::: warning Don't set COOKIE_SECURE=true on plain http
A `Secure` cookie is only sent over HTTPS. If you enable it while still serving `http://`, the browser drops the session cookie and you can't stay logged in. Keep it `false` until TLS is actually in front.
:::

## Discord redirect URI

If you use Discord login, make sure `DISCORD_REDIRECT_URI` uses your `https://` domain and matches the redirect registered in the Discord app **exactly** — e.g. `https://panel.example.com/api/auth/discord/callback`. See [Authentication & roles](/reference/authentication).
