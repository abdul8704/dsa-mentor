# AlgoMentor Public API (v1)

A read-only JSON API that lets anyone (a portfolio site, a README badge
generator, a script, an AI agent) show an AlgoMentor user's dashboard widgets:
streaks, the activity heatmap, solved counts, contest ratings, topics, recent
solves and contest attendance.

Everything is **opt-in**. A user's data is private until they switch on a
public profile, and even then only the widgets they tick are shared.

- **Base URL:** `https://dsa-mentor-seven.vercel.app/api/public/v1`
- **Auth:** none. Requests are anonymous, `GET` only, no cookies or keys.
- **CORS:** `Access-Control-Allow-Origin: *`, so you can call it straight from browser code on any domain.
- **Rate limit:** 60 requests per minute per client IP.
- **Freshness:** responses are cached for up to 5 minutes. The underlying platform data is refreshed by AlgoMentor every 3 hours.

---

## Contents

1. [For users: turning on your public API](#1-for-users-turning-on-your-public-api)
2. [Quick start for developers](#2-quick-start-for-developers)
3. [Conventions](#3-conventions)
4. [Endpoints](#4-endpoints)
5. [Errors](#5-errors)
6. [Rate limits](#6-rate-limits)
7. [Caching and freshness](#7-caching-and-freshness)
8. [Privacy and security](#8-privacy-and-security)
9. [Guidelines for consumers](#9-guidelines-for-consumers)
10. [Guide for AI agents](#10-guide-for-ai-agents)
11. [Operator notes (running and extending the API)](#11-operator-notes-running-and-extending-the-api)

---

## 1. For users: turning on your public API

1. Sign in and open **Settings** in the sidebar.
2. Scroll to the **Public profile & API** card.
3. Pick a **public handle**. It becomes part of your API URLs.
   - 3–30 characters: lowercase letters `a-z`, digits `0-9` and hyphens `-`.
   - It can't start or end with a hyphen.
   - It must be unique, and a few names (`admin`, `api`, `support`, …) are reserved.
4. Tick the **widgets** you want to share (all are ticked by default):

   | Widget key        | What it shares                                   | Dashboard component                     |
   |-------------------|--------------------------------------------------|-----------------------------------------|
   | `profile`         | Display name, bio, avatar URL                    | ProfileCard                             |
   | `streak`          | Current/longest streak, solved today, 7/30-day counts | ProfileCard, StreakStatsCard        |
   | `heatmap`         | Daily solved counts for the last 364 days        | Heatmap                                 |
   | `stats`           | Solved by difficulty, per-platform totals and ratings | StatsOverview                      |
   | `contest-rating`  | Contest rating history                           | ContestRatingGraph                      |
   | `topics`          | Topic (tag) breakdown, all-time and last 7 days  | TopicDonut, TopicProgressBars           |
   | `recent-problems` | Most recently solved problems                    | RecentProblemsTable                     |
   | `contests`        | Contests held in the last 7 days and whether you took part | RecentContests                |

5. Switch on **Make my selected widgets public** and press **Save public settings**.
6. The card then shows your URLs, for example
   `https://dsa-mentor-seven.vercel.app/api/public/v1/users/<handle>/dashboard`.

**Turning it off:** untick the switch and save. Our own servers stop serving
your data immediately. Copies already held by the CDN or by a visitor's
browser expire within 5 minutes.

**Hiding one widget:** untick it and save. It then returns `404 widget_not_public`.

**Changing your handle:** the old handle stops working immediately (after CDN
expiry) and is free for someone else to claim. Update any site that uses it.

---

## 2. Quick start for developers

### curl

```bash
curl https://dsa-mentor-seven.vercel.app/api/public/v1/users/aziz/dashboard
```

### Browser / any frontend (fetch)

```js
const BASE = "https://dsa-mentor-seven.vercel.app/api/public/v1";

async function getAlgoMentor(handle) {
  const res = await fetch(`${BASE}/users/${encodeURIComponent(handle)}/dashboard`);
  if (res.status === 404) return null;            // profile not public (or no such handle)
  if (res.status === 429) throw new Error("rate limited, retry later");
  if (!res.ok) throw new Error(`AlgoMentor API error ${res.status}`);
  const { data } = await res.json();
  return data.widgets;                            // { profile: {...}, streak: {...}, ... }
}
```

### Next.js portfolio (recommended: server-side with revalidation)

Fetching on the server keeps visitors' browsers from each spending your
rate limit, and Next caches the result for you:

```tsx
// app/components/CodingStats.tsx (Server Component)
const BASE = "https://dsa-mentor-seven.vercel.app/api/public/v1";

export default async function CodingStats() {
  const res = await fetch(`${BASE}/users/aziz/dashboard`, { next: { revalidate: 900 } });
  if (!res.ok) return null;
  const { data } = await res.json();
  const { streak, stats } = data.widgets;

  return (
    <section>
      <p>{stats?.totals.solved ?? 0} problems solved</p>
      <p>{streak?.currentStreak ?? 0}-day streak</p>
    </section>
  );
}
```

### TypeScript types

Copy these if you want typed responses. They match the field tables in §4.

```ts
export interface Envelope<T> { data: T; meta: Meta }
export interface Meta {
  apiVersion: "v1"; servedAt: string; maxAgeSeconds: number;
  handle?: string; widget?: string; limit?: number;
}
export interface ApiError { error: { code: ErrorCode; message: string } }
export type ErrorCode = "not_found" | "widget_not_public" | "invalid_request"
  | "rate_limited" | "method_not_allowed" | "internal_error";

export type Platform = "leetcode" | "codeforces" | "atcoder" | "cses";

export interface ProfileWidget { handle: string; name: string; bio: string | null; avatarUrl: string | null }
export interface StreakWidget {
  currentStreak: number; longestStreak: number; solvedToday: number;
  last7Days: { solved: number; changePercent: number; daily: { date: string; count: number }[] };
  last30Days: { solved: number; previous30Days: number };
  contestsLast7Days: number;
}
export interface HeatmapWidget {
  from: string | null; to: string | null; totalSolved: number; activeDays: number;
  days: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
}
export interface StatsWidget {
  totals: { solved: number; easy: number; medium: number; hard: number };
  platforms: { platform: Platform; solved: number; easy: number; medium: number; hard: number;
               rating: number | null; maxRating: number | null }[];
}
export interface ContestRatingWidget {
  current: number; peak: number; lastChange: number; totalContests: number;
  history: { date: string; rating: number; contestId: string; platform: Platform | null }[];
}
export interface TopicsWidget {
  allTime: { topic: string; count: number; percentage: number }[];
  last7Days: { topic: string; count: number; percentage: number; changeVsPrevious7Days: number }[];
}
export interface RecentProblemsWidget {
  problems: { problemId: string; title: string; platform: Platform; difficulty: string | null;
              rating: number | null; tags: string[]; solvedDate: string; isRepeatSolve: boolean;
              url: string | null }[];
}
export interface ContestsWidget {
  windowDays: 7; attended: number; total: number;
  contests: { platform: "codeforces" | "leetcode" | "atcoder"; name: string; url: string;
              startTime: string; durationMinutes: number; attended: boolean }[];
}
export interface DashboardBundle {
  handle: string;
  widgets: Partial<{
    profile: ProfileWidget; streak: StreakWidget; heatmap: HeatmapWidget; stats: StatsWidget;
    "contest-rating": ContestRatingWidget; topics: TopicsWidget;
    "recent-problems": RecentProblemsWidget; contests: ContestsWidget;
  }>;
}
```

---

## 3. Conventions

- **Methods:** only `GET` (and `OPTIONS` for CORS preflight). Anything else returns `405` or `404`.
- **Handles** are case-insensitive in URLs (`/users/Aziz` = `/users/aziz`); responses always use the lowercase form.
- **Success envelope:**

  ```json
  {
    "data": { "...": "endpoint-specific" },
    "meta": {
      "apiVersion": "v1",
      "servedAt": "2026-10-07T15:49:52.534Z",
      "maxAgeSeconds": 300,
      "handle": "aziz",
      "widget": "streak"
    }
  }
  ```

  `servedAt` is when this response was produced. The data inside can be up to
  `maxAgeSeconds` older than that because of caching (see §7).
- **Error envelope:** `{ "error": { "code": "not_found", "message": "…" } }` (see §5).
- **Dates** (`date`, `solvedDate`, `from`, `to`) are UTC calendar days, `YYYY-MM-DD`.
- **Timestamps** (`startTime`, `servedAt`) are ISO 8601 in UTC.
- **Platforms** are lowercase: `leetcode`, `codeforces`, `atcoder`, `cses`.
- **Versioning:** breaking changes ship under a new prefix (`/api/public/v2`). Within v1, fields may be **added** but are never removed or renamed, so ignore unknown fields.

---

## 4. Endpoints

| Method | Path                                         | Opt-in needed | Description                                   |
|--------|----------------------------------------------|---------------|-----------------------------------------------|
| GET    | `/api/public/v1`                             | no            | Discovery: endpoint list and widget keys      |
| GET    | `/api/public/v1/users/{handle}`              | yes           | Which widgets the user shares, with links     |
| GET    | `/api/public/v1/users/{handle}/dashboard`    | yes           | Every shared widget in one response           |
| GET    | `/api/public/v1/users/{handle}/{widget}`     | yes + widget  | A single widget                               |
| GET    | `/api/public/v1/contests/upcoming`           | no            | Platform-wide contest schedule (no user data) |

### 4.1 `GET /api/public/v1`

Discovery document.

```json
{
  "data": {
    "name": "AlgoMentor public API",
    "version": "v1",
    "endpoints": {
      "user": "/api/public/v1/users/{handle}",
      "dashboard": "/api/public/v1/users/{handle}/dashboard",
      "widget": "/api/public/v1/users/{handle}/{widget}",
      "upcomingContests": "/api/public/v1/contests/upcoming"
    },
    "widgets": ["profile", "streak", "heatmap", "stats", "contest-rating", "topics", "recent-problems", "contests"]
  },
  "meta": { "apiVersion": "v1", "servedAt": "…", "maxAgeSeconds": 300 }
}
```

### 4.2 `GET /api/public/v1/users/{handle}`

| Path param | Type   | Description                     |
|------------|--------|---------------------------------|
| `handle`   | string | The user's public handle        |

```json
{
  "data": {
    "handle": "aziz",
    "widgets": ["profile", "streak", "heatmap"],
    "links": {
      "dashboard": "/api/public/v1/users/aziz/dashboard",
      "profile": "/api/public/v1/users/aziz/profile",
      "streak": "/api/public/v1/users/aziz/streak",
      "heatmap": "/api/public/v1/users/aziz/heatmap"
    }
  },
  "meta": { "apiVersion": "v1", "servedAt": "…", "maxAgeSeconds": 300, "handle": "aziz" }
}
```

Errors: `404 not_found` when the handle doesn't exist **or** the profile isn't public.

### 4.3 `GET /api/public/v1/users/{handle}/dashboard`

All shared widgets in one call. **Use this for portfolios**: one request
instead of eight, so it counts once against the rate limit.

| Query param | Type    | Default | Description                                               |
|-------------|---------|---------|-----------------------------------------------------------|
| `limit`     | integer | 20      | 1–50. Applies to the `recent-problems` widget in the bundle |

```json
{
  "data": {
    "handle": "aziz",
    "widgets": {
      "profile": { "handle": "aziz", "name": "Aziz", "bio": "CP fan", "avatarUrl": "https://…/avatar.png" },
      "streak":  { "currentStreak": 5, "longestStreak": 9, "…": "…" },
      "heatmap": { "from": "2025-10-09", "to": "2026-10-07", "…": "…" }
    }
  },
  "meta": { "apiVersion": "v1", "servedAt": "…", "maxAgeSeconds": 300, "handle": "aziz", "widget": "dashboard" }
}
```

`data.widgets` contains only the widgets the user shares. Widgets they hide
are simply absent, so check before reading (`widgets.streak?.currentStreak`).

### 4.4 `GET /api/public/v1/users/{handle}/{widget}`

| Path param | Type   | Values                                                                                     |
|------------|--------|--------------------------------------------------------------------------------------------|
| `handle`   | string | Public handle                                                                              |
| `widget`   | string | `profile`, `streak`, `heatmap`, `stats`, `contest-rating`, `topics`, `recent-problems`, `contests` |

Errors: `404 not_found` (unknown handle, profile not public, or unknown
widget name), `404 widget_not_public` (profile is public but this widget is
hidden), `400 invalid_request` (bad `limit`).

The `data` for each widget:

#### `profile`

```json
{ "handle": "aziz", "name": "Aziz", "bio": "Competitive programmer", "avatarUrl": "https://…/avatar.png" }
```

| Field       | Type           | Description                                        |
|-------------|----------------|----------------------------------------------------|
| `handle`    | string         | Public handle                                      |
| `name`      | string         | Display name (falls back to the handle)            |
| `bio`       | string \| null | Profile description                                |
| `avatarUrl` | string \| null | Public avatar image URL                            |

#### `streak`

```json
{
  "currentStreak": 5,
  "longestStreak": 9,
  "solvedToday": 1,
  "last7Days": {
    "solved": 7,
    "changePercent": 17,
    "daily": [
      { "date": "2026-10-01", "count": 1 },
      { "date": "2026-10-02", "count": 0 },
      { "date": "2026-10-03", "count": 2 },
      { "date": "2026-10-04", "count": 1 },
      { "date": "2026-10-05", "count": 1 },
      { "date": "2026-10-06", "count": 1 },
      { "date": "2026-10-07", "count": 1 }
    ]
  },
  "last30Days": { "solved": 30, "previous30Days": 22 },
  "contestsLast7Days": 1
}
```

| Field                    | Type   | Description                                                                 |
|--------------------------|--------|-----------------------------------------------------------------------------|
| `currentStreak`          | number | Consecutive days with ≥1 accepted solve, including today if solved today    |
| `longestStreak`          | number | Longest streak ever                                                         |
| `solvedToday`            | number | Problems accepted today (UTC)                                               |
| `last7Days.solved`       | number | Solves in the 7 days ending today                                           |
| `last7Days.changePercent`| number | % change vs the 7 days before (100 when the previous week was 0)            |
| `last7Days.daily`        | array  | Exactly 7 entries, oldest first, last one is today                          |
| `last30Days.solved`      | number | Solves in the last 30 days                                                  |
| `last30Days.previous30Days` | number | Solves in days 31–60 ago                                                 |
| `contestsLast7Days`      | number | Rated contests taken part in during the last 7 days                         |

#### `heatmap`

```json
{
  "from": "2025-10-09",
  "to": "2026-10-07",
  "totalSolved": 412,
  "activeDays": 133,
  "days": [
    { "date": "2025-10-09", "count": 0, "level": 0 },
    { "date": "2025-10-10", "count": 3, "level": 2 }
  ]
}
```

`days` always has 364 entries (oldest first), including zero days.
`level` is the colour bucket the dashboard uses: `0` = 0 solves, `1` = 1,
`2` = 2–3, `3` = 4–5, `4` = 6 or more. A day's `count` is problems accepted
that day across all connected platforms.

#### `stats`

```json
{
  "totals": { "solved": 640, "easy": 210, "medium": 300, "hard": 130 },
  "platforms": [
    { "platform": "leetcode",   "solved": 420, "easy": 150, "medium": 210, "hard": 60, "rating": 1850, "maxRating": 1902 },
    { "platform": "codeforces", "solved": 180, "easy": 50,  "medium": 80,  "hard": 50, "rating": 1520, "maxRating": 1611 },
    { "platform": "cses",       "solved": 40,  "easy": 10,  "medium": 10,  "hard": 20, "rating": 0,    "maxRating": 0 }
  ]
}
```

`totals.solved` is the authoritative total; `easy + medium + hard` can be
lower because some problems have no difficulty. Platforms without ratings
(CSES) report `0` or `null`.

#### `contest-rating`

```json
{
  "current": 1520,
  "peak": 1611,
  "lastChange": -34,
  "totalContests": 27,
  "history": [
    { "date": "2026-09-21", "rating": 1554, "contestId": "CF-2050", "platform": "codeforces" },
    { "date": "2026-10-04", "rating": 1520, "contestId": "CF-2061", "platform": "codeforces" }
  ]
}
```

`history` is oldest first across all platforms. Ratings on different
platforms use different scales, so group by `platform` before drawing one
line per platform. `lastChange` compares the two most recent contests on the
same platform as the latest contest.

#### `topics`

```json
{
  "allTime": [
    { "topic": "dynamic programming", "count": 120, "percentage": 18 },
    { "topic": "greedy", "count": 95, "percentage": 14 }
  ],
  "last7Days": [
    { "topic": "graphs", "count": 6, "percentage": 30, "changeVsPrevious7Days": 4 }
  ]
}
```

Counted per tag: a problem with three tags adds 1 to each. Sorted by
`count`, largest first. `changeVsPrevious7Days` is an absolute difference in
count.

#### `recent-problems`

| Query param | Type    | Default | Description                    |
|-------------|---------|---------|--------------------------------|
| `limit`     | integer | 20      | Number of problems, 1–50       |

```json
{
  "problems": [
    {
      "problemId": "CF1234A",
      "title": "Equalize Prices Again",
      "platform": "codeforces",
      "difficulty": "easy",
      "rating": 800,
      "tags": ["math"],
      "solvedDate": "2026-10-07",
      "isRepeatSolve": false,
      "url": "https://codeforces.com/problemset/problem/1234/A"
    }
  ]
}
```

Newest first. `isRepeatSolve` is true when the user had already solved the
problem before. `url` is `null` if the problem id format isn't recognized.

#### `contests`

```json
{
  "windowDays": 7,
  "attended": 1,
  "total": 4,
  "contests": [
    {
      "platform": "codeforces",
      "name": "Codeforces Round 1000 (Div. 2)",
      "url": "https://codeforces.com/contest/2063",
      "startTime": "2026-10-04T14:35:00.000Z",
      "durationMinutes": 120,
      "attended": true
    }
  ]
}
```

Contests held on Codeforces, LeetCode and AtCoder in the last 7 days, each
marked with whether the user took part.

### 4.5 `GET /api/public/v1/contests/upcoming`

Platform-wide schedule for the next 7 days. It has no user data, so it needs
no handle or opt-in.

```json
{
  "data": {
    "contests": [
      {
        "platform": "leetcode",
        "name": "Weekly Contest 470",
        "url": "https://leetcode.com/contest/weekly-contest-470",
        "startTime": "2026-10-12T02:30:00.000Z",
        "durationMinutes": 90
      }
    ]
  },
  "meta": { "apiVersion": "v1", "servedAt": "…", "maxAgeSeconds": 300 }
}
```

---

## 5. Errors

| HTTP | `error.code`         | When                                                                 | What to do                              |
|------|----------------------|----------------------------------------------------------------------|-----------------------------------------|
| 400  | `invalid_request`    | A query parameter is invalid (e.g. `limit=0`)                         | Fix the request                         |
| 404  | `not_found`          | Unknown handle, profile not public, unknown widget, or unknown path   | Show a fallback; don't retry in a loop  |
| 404  | `widget_not_public`  | The profile is public but this widget is hidden                       | Hide that section of your UI            |
| 405  | (Next.js default)    | Method other than `GET`/`OPTIONS` on an existing endpoint             | Use `GET`                               |
| 429  | `rate_limited`       | More than 60 requests in the current minute from your IP              | Wait `Retry-After` seconds, then retry  |
| 500  | `internal_error`     | Something failed on our side                                          | Retry later with backoff                |

"No such handle" and "profile not public" deliberately return the **same**
404, so the API can't be used to discover who has an account.

Error responses are never cached (`Cache-Control: no-store`).

---

## 6. Rate limits

- **60 requests per minute per client IP**, shared across every public endpoint.
- Fixed one-minute windows. Every response carries:

  | Header                  | Meaning                                         |
  |-------------------------|-------------------------------------------------|
  | `X-RateLimit-Limit`     | Requests allowed per window (60)                |
  | `X-RateLimit-Remaining` | Requests left in the current window             |
  | `X-RateLimit-Reset`     | Unix time (seconds) when the window resets      |
  | `Retry-After`           | Only on `429`: seconds to wait                  |

- These headers are exposed to browser JavaScript through CORS.
- Requests answered by the CDN cache (see §7) don't reach our servers and don't count.
- If you call the API from your **server**, all your visitors share your
  server's IP and its 60/minute budget. Cache on your side (see §9).

---

## 7. Caching and freshness

| Layer                     | Lifetime     | Notes                                                        |
|---------------------------|--------------|--------------------------------------------------------------|
| Browser                   | 60 s         | `Cache-Control: max-age=60`                                  |
| CDN (Vercel edge)         | 300 s        | `s-maxage=300, stale-while-revalidate=600`                   |
| AlgoMentor server (Redis) | 300 s        | Per user and widget; cleared when the user saves settings    |
| Handle lookup             | 60 s         | Cleared when the user saves settings                         |
| Platform data             | every 3 h    | AlgoMentor re-syncs LeetCode/Codeforces/AtCoder/CSES         |

So a new solve typically appears within a few hours. Settings changes (turning
off, hiding a widget, renaming the handle) take effect on our servers at once
and everywhere within 5 minutes.

---

## 8. Privacy and security

**Never exposed, on any endpoint:**

- email address, Supabase user id, or any internal id
- connected platform handles, session cookies, LeetCode/CSES credentials
- mentorship relationships, mentor notes, assignments, groups
- anything from a user who hasn't opted in, or a widget they've hidden

**How that's enforced:**

- Opt-in lives in the `public_profiles` table (`enabled` + `widgets`). Every
  request resolves the handle there first; nothing else is read unless the
  profile is enabled and the widget is listed.
- Responses are built field by field from an allow-list (`app/lib/public-api/serializers.ts`),
  so new database columns can't leak by accident.
- The API is read-only and can never start a data refresh or scrape, so
  traffic to it can't be turned into traffic against LeetCode, Codeforces,
  AtCoder or cses.fi.
- No cookies are read or set, and CORS doesn't allow credentials, which is why
  allowing every origin is safe.
- Per-IP rate limiting plus caching keeps public traffic away from the database.

**What users should know before turning it on:** anything you share is
public. Anyone who knows your handle can read it, and others may copy or
store it. Only tick what you're happy to publish.

---

## 9. Guidelines for consumers

1. **Prefer `/dashboard`.** One request returns everything you need.
2. **Fetch on the server or at build time** when you can (Next.js
   `revalidate`, Astro/Gatsby build step, a cron job writing JSON). Your page
   loads faster and you never hit the rate limit.
3. **Don't refresh more often than every 5 minutes.** The data won't change sooner.
4. **Handle 404 gracefully.** A user can turn their profile off at any time; render
   nothing (or a "stats unavailable" note) rather than an error page.
5. **Read widgets defensively.** Any widget can be missing from `/dashboard`.
6. **Back off on 429 and 5xx.** Respect `Retry-After`; use exponential backoff for 5xx.
7. **Ignore unknown fields.** v1 may add fields.
8. **Don't scrape other users.** Only display profiles whose owners shared their handle with you.
9. **Attribution is appreciated:** "Stats via AlgoMentor".

---

## 10. Guide for AI agents

When asked to show someone's AlgoMentor stats:

1. Get the user's **public handle** from them. Don't guess handles or try variants.
2. `GET https://dsa-mentor-seven.vercel.app/api/public/v1/users/{handle}` to learn which widgets are shared.
   - `404 not_found`: tell the user their public API is off or the handle is wrong, and point them to
     **Settings → Public profile & API** (§1). Stop there.
3. `GET …/users/{handle}/dashboard` for everything in one request (add `?limit=N` for more recent problems).
4. Use the field descriptions in §4. Dates are UTC days. Don't compare ratings across platforms.
5. If you get `429`, wait `Retry-After` seconds; don't retry in a tight loop.
6. To generate portfolio code, use the server-side Next.js example in §2 and the TypeScript types.

Machine-readable entry point: `GET /api/public/v1` lists every endpoint and widget key.

---

## 11. Operator notes (running and extending the API)

### Deploying

1. Apply the migration `dsa-mentor-worker/supabase/migrations/20261007120000_public_profiles.sql`
   (creates `public_profiles` with owner-only RLS).
2. Make sure the **Vercel** project for `dsa-mentor` has:
   - `SUPABASE_SERVICE_ROLE_KEY` (the public routes read with the service-role client after the opt-in check)
   - Redis (`REDIS_URL`, or `REDIS_HOST`/`REDIS_PORT`/`REDIS_USERNAME`/`REDIS_PASSWORD`/`REDIS_TLS`), which the
     rate limiter and response cache use. Without Redis the API still works, but rate limiting falls back
     to a weaker per-instance counter and every request hits the database.
3. Deploy `dsa-mentor`. The worker needs no deploy for the API itself.

### Where the code lives (`dsa-mentor/`)

| File                                                  | Role                                                        |
|-------------------------------------------------------|-------------------------------------------------------------|
| `app/api/public/v1/route.ts`                          | Discovery endpoint                                          |
| `app/api/public/v1/users/[handle]/route.ts`           | User summary                                                |
| `app/api/public/v1/users/[handle]/[widget]/route.ts`  | Single widget and `/dashboard` bundle                       |
| `app/api/public/v1/contests/upcoming/route.ts`        | Upcoming contests                                           |
| `app/api/public/[...path]/route.ts`                   | JSON 404 for unknown paths (stops the `/api/*` worker rewrite) |
| `app/lib/public-api/profile.ts`                       | Handle → user resolution (the opt-in gate), cache purge     |
| `app/lib/public-api/data.ts`                          | Loads each widget with the service-role client, Redis cache |
| `app/lib/public-api/serializers.ts`                   | Allow-listed response shapes                                |
| `app/lib/public-api/http.ts`                          | Envelope, CORS, cache headers, error format                 |
| `app/lib/public-api/rate-limit.ts`                    | Per-IP fixed-window limiter (Redis, in-memory fallback)     |
| `app/lib/public-api/widgets.ts`                       | Widget keys, handle rules (shared with the Settings card)   |
| `app/lib/analytics/queries.ts`                        | Dashboard queries, shared by the dashboard and the API      |
| `app/lib/contests/schedule.ts`                        | Contest schedule + attendance, shared likewise              |
| `app/actions/publicProfile.actions.ts`                | Load/save the signed-in user's own public settings          |
| `app/dashboard/components/PublicApiSettings.tsx`      | Settings card                                               |
| `proxy.ts`                                            | Excludes `/api/public` from the auth redirect               |

### Tuning

- Rate limit: `PUBLIC_RATE_LIMIT` in `rate-limit.ts`.
- Cache lifetimes: `PUBLIC_CACHE_SECONDS` (`http.ts`), `DATA_CACHE_SECONDS` (`data.ts`),
  `PROFILE_CACHE_SECONDS` (`profile.ts`). If you change them, update §6–§7.

### Adding a widget

1. Add its key to `PUBLIC_WIDGETS` and `PUBLIC_WIDGET_LABELS` in `widgets.ts`.
2. Add the key to both arrays in the `public_profiles` check constraint (new migration).
3. Add a `case` in `loadWidget` (`data.ts`) and an allow-listed serializer in `serializers.ts`.
4. Document it in §4 and the TypeScript types in §2.

---

_Changelog_ — **v1 (2026-10-07):** first release.
