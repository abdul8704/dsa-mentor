# Widget API (`/api/widget/v1`)

Token-authenticated API for the desktop LeetCode widget. Unlike `/api/public`, this is private to the account owner: the user links a widget once and it then reads their own data.

## Linking (pairing code)

1. `POST /api/widget/v1/link/start` `{ deviceName? }` → `{ deviceCode, userCode, verifyUrl, expiresIn: 600, interval: 2 }`. `deviceCode` stays secret in the widget.
2. The widget opens `verifyUrl` (`/link?code=K7QF-29XM`). The signed-in user clicks **Allow** (server actions in `app/actions/widget.actions.ts`). Signed-out users are sent to `/auth?redirect=…` and returned afterwards (password and Google login both honor it).
3. `POST /api/widget/v1/link/token` `{ deviceCode }` every `interval` seconds → `400 authorization_pending` until approved, then `{ token, user: { name } }` exactly once (`expired_token` / `access_denied` otherwise).

Only SHA-256 hashes of device codes and tokens are stored (`widget_link_codes`, `widget_tokens`). Tokens look like `amw_…`; users revoke them under Settings → Connected widgets, and a widget can revoke itself with `DELETE /api/widget/v1/me/token`.

## Data

`GET /api/widget/v1/me/summary?tz=Asia/Kolkata` with `Authorization: Bearer amw_…`

```json
{ "data": {
  "user": { "name": "Aziz", "avatarUrl": null },
  "timeZone": "Asia/Kolkata", "date": "2026-10-09",
  "solvedToday": { "total": 5, "platforms": [{ "platform": "leetcode", "count": 3 }] },
  "totals": { "solved": 812, "easy": 300, "medium": 400, "hard": 112 },
  "platforms": [{ "platform": "leetcode", "solved": 600, "easy": 250, "medium": 290, "hard": 60, "rating": null, "maxRating": null }],
  "last7Days": [{ "date": "2026-10-03", "count": 4, "platforms": [{ "platform": "leetcode", "count": 3 }, { "platform": "codeforces", "count": 1 }] }]
}, "meta": { "servedAt": "…" } }
```

`totals`/`platforms` are the same values as the dashboard's difficulty and platform cards. "Today" and `last7Days` are computed in the `tz` the widget sends (UTC if missing or invalid), counting distinct problems. Each `last7Days` entry's `platforms` lists only platforms with at least one solve that day, highest first.

## Setup

Apply `supabase/migrations/20261009120000_widget_links.sql`. Set `NEXT_PUBLIC_APP_URL` so `verifyUrl` points at the public site.
