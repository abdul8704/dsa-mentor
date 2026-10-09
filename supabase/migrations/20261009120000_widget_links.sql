-- Pairing-code linking for the desktop widget.
--
-- widget_link_codes: short-lived device-flow records. Only ever touched by the
-- service-role client (RLS on, no policies), so users cannot read or forge them.
-- widget_tokens: one row per connected widget. Only the SHA-256 of the token is
-- stored. Owners can list and revoke their own rows.

create table if not exists public.widget_link_codes (
    id               uuid primary key default gen_random_uuid(),
    device_code_hash text not null unique,
    user_code        text not null unique,
    device_name      text not null default 'LeetCode Widget',
    status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'denied', 'consumed')),
    user_id          uuid references auth.users (id) on delete cascade,
    expires_at       timestamptz not null,
    created_at       timestamptz not null default now()
);

alter table public.widget_link_codes enable row level security;

create table if not exists public.widget_tokens (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users (id) on delete cascade,
    token_hash   text not null unique,
    device_name  text not null default 'LeetCode Widget',
    created_at   timestamptz not null default now(),
    last_used_at timestamptz,
    revoked_at   timestamptz
);

create index if not exists widget_tokens_user_idx on public.widget_tokens (user_id);

alter table public.widget_tokens enable row level security;

create policy "widget_tokens_select_own" on public.widget_tokens
    for select using (auth.uid() = user_id);

create policy "widget_tokens_revoke_own" on public.widget_tokens
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
