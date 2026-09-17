# System Architecture — AlgoMentor

## 1. Overview & Architectural Patterns

AlgoMentor is a competitive programming analytics and mentorship platform designed to aggregate problem-solving metrics, streaks, topic distributions, and contest performance across **LeetCode**, **Codeforces**, and **AtCoder**.

### Core Tech Stack
- **Framework**: Next.js 16 (App Router) & React 19
- **Runtime & Mutations**: React Server Components (RSC) and Next.js Server Actions
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & Supabase SSR Auth (`@supabase/ssr`)
- **In-Memory Cache**: Redis via `ioredis` for public contest schedules and external metadata
- **Object Storage**: AWS S3 (`@aws-sdk/client-s3`) for profile picture avatar storage
- **Email Delivery**: Nodemailer SMTP client for mentorship invitations
- **Scraping & Integration**: Cheerio, Axios, and custom HTTP client with rate-limiting queues and exponential backoff

---

## 2. High-Level System Architecture & Component Boundaries

```
+-----------------------------------------------------------------------------------+
|                                 Client Browser                                    |
+-----------------------------------------------------------------------------------+
                                          |  (HTTP / Server Actions)
                                          v
+-----------------------------------------------------------------------------------+
|                               Next.js Server Runtime                              |
|  +-----------------------+   +------------------------+   +--------------------+  |
|  | Proxy / Middleware    |   | Server Components      |   | Server Actions     |  |
|  | (Auth & Onboarding)   |   | (RSC Data Fetching)    |   | (Mutations)        |  |
|  +-----------------------+   +------------------------+   +--------------------+  |
+-----------------------------------------------------------------------------------+
            |                              |                             |
            v                              v                             v
+-----------------------+      +-----------------------+     +----------------------+
|   Supabase Postgres   |      |      Redis Cache      |     |  AWS S3 & SMTP       |
| (RLS & Service Role)  |      |  (Contest Schedules)  |     | (Avatars & Invites)  |
+-----------------------+      +-----------------------+     +----------------------+
            |                                                            |
            +------------------------------+-----------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      |       External Platform Services         |
                      |  - LeetCode GraphQL                      |
                      |  - Codeforces REST API / HTML Scraping   |
                      |  - AtCoder HTML Scraping & Kenkoooo API  |
                      +------------------------------------------+
```

---

## 3. Data Models & Persistence Boundaries

The application uses Supabase PostgreSQL as its primary transactional database. Tables are structured across three functional domains:

### User & Platform Profiles
- `profile`: Core user profile information (`user_id`, `name`, `description`, `avatar_url`, `onboarding_completed`, `last_refreshed`).
- `user_platforms`: Platform handle associations per user (`user_id`, `platform`, `handle`, `last_synced_at`).
- `user_platform_data`: Aggregated per-platform metrics (`solved_count`, `rating`, `max_rating`, `easy`, `medium`, `hard`).

### Analytics & Activity Tracking
- `user-streak`: Tracked daily solving streak metrics (`curr_streak`, `longest_streak`, `updated_on`).
- `daily_count`: Daily solved problem aggregates for the heatmaps (`user_id`, `date`, `solved`).
- `solved_problems`: Normalized log of solved problem records (`user_id`, `problem_id`, `platform`, `solved_at`, `solved_date`, `already_solved`).
- `user_contest`: Contest participation and rating changes (`user_id`, `contest_id`, `platform`, `rating`, `rank`, `date`).
- `problems`: Platform-wide shared catalog of problems (`problem_id`, `platform`, `title`, `difficulty`, `rating`, `tags`).

### Mentorship & Operations
- `mentorships`: Active mentor-mentee linkages (`mentor_id`, `mentee_id`, `status`).
- `invites`: Tokenized mentorship invitations (`mentor_id`, `invitee_email`, `invitee_user_id`, `status`, `token`, `expires_at`).
- `mentee_groups` & `mentee_group_members`: Mentor-only batch management abstractions.
- `mentor_notes`: Direct communications sent from mentors to mentees.
- `assignments`: Problem tasks assigned by mentors with due dates and verification tracking.

---

## 4. API Surface & Routing

### Edge / Middleware Routing (`proxy.ts`)
- Intercepts incoming requests to guard protected routes (`/dashboard/*`, `/onboarding`).
- Redirects unauthenticated users to `/auth` and incomplete onboarding profiles to `/onboarding`.

### Route Handlers
- `GET /auth/callback`: Handles OAuth authorization code exchange.
- `POST /api/account/delete`: Hard deletes all user-scoped records, AWS S3 avatars, and authentication identity upon strict confirmation.

### Server Actions (`app/actions/`)
- `analytics.actions.ts`: Aggregates profile statistics, streak calculations, heatmap arrays, topic distribution, and paginated problem histories.
- `mentorship.actions.ts`: Manages user search, invitation sending via SMTP, invite responses, and mentee roster summaries.
- `assignment.actions.ts`: Resolves problem metadata, persists assignments, tracks task completion, and computes mentor insights.
- `group.actions.ts`: Handles creation, membership editing, and batch problem/note assignments for mentor groups.
- `avatar.actions.ts`: Manages binary image uploads to AWS S3 and profile URL updates.

---

## 5. Security, Trust Boundaries & Data Protection

- **Authentication**: Managed via Supabase Auth issuing JWT tokens stored in HTTP-only cookies handled by `@supabase/ssr`.
- **Authorization & RLS**: PostgreSQL Row-Level Security ensures users can only access their own profile and task data.
- **Cross-User Data Access**: Mentors access mentee analytics strictly via server-side authorization guards (`assertMentorOf`, `isActiveMentorship`) utilizing a service-role client (`getServiceRoleClient()`).
- **Data Erasure**: Complete, cascading account wipe via `deleteAccountCompletely()` across all 13 user-scoped tables and S3 object prefixes (`avatars/{userId}/`).

---

## 6. External System Integrations & Resilience

- **Hardened HTTP Client (`app/lib/problemMeta/httpClient.ts`)**:
  - Implements per-host request queues (`codeforces.com`, `leetcode.com`, `kenkoooo.com`) to prevent rate limiting.
  - Enforces exponential backoff with jitter and retry handling for `403`, `429`, and `5xx` responses.
  - Leverages single-flight execution and in-memory TTL caching for heavy catalog endpoints.
- **Redis Caching (`app/lib/redis/client.ts`)**:
  - Caches public contest schedules (`contests:upcoming`, `contests:past`) for 1800 seconds to decouple user queries from external API availability.