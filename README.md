# New JA Portfolio

Portfolio website with real server-side authentication, PostgreSQL persistence,
role-based access control, project likes, account administration, and audit logs.

## Roles

- `user`: register, log in, log out, and like projects.
- `admin`: all user permissions plus view logs/likes, change roles, enable or
  disable accounts, and delete accounts.

Admin authorization is checked by the server on every protected API. The browser
cannot grant itself admin access.

## Local development

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="replace-with-a-long-random-password"
$env:ADMIN_NAME="New JA Admin"
npm.cmd install
npm.cmd run dev
```

Without `DATABASE_URL`, development uses an in-memory PostgreSQL-compatible
database. Data resets whenever the server restarts.

For persistent local data, create PostgreSQL and set:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/newja_portfolio"
```

## Render deployment

`render.yaml` provisions the web service and PostgreSQL database. In the Render
dashboard, set these secret environment variables before deploying:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (minimum 12 characters; use a long random value)

`DATABASE_URL` is connected automatically from the database declared in
`render.yaml`.

## Security

- Passwords are hashed with bcrypt cost 12.
- Sessions use random server-side tokens in `HttpOnly`, `SameSite=Lax` cookies.
- Login and registration are rate limited.
- Helmet adds security headers and a restrictive content security policy.
- Disabled accounts have all active sessions revoked.
- Authentication and admin actions are written to PostgreSQL audit logs.
- Backend source, `.env`, and package metadata are not publicly served.
