-- ══════════════════════════════════════════════════════
-- VANTAGE NEXUS — Database Schema
-- Run this in your Supabase SQL editor
-- ══════════════════════════════════════════════════════

-- Users / profiles (extends Supabase auth.users)
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  tier         text not null default 'scout' check (tier in ('scout','enforcer','sovereign','agency')),
  api_key      text unique,
  scan_count   int  not null default 0,
  created_at   timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id);

-- Assets (creator's protected content fingerprints)
create table if not exists assets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  label        text not null,
  fingerprint  text,                    -- perceptual hash
  metadata     jsonb default '{}',
  created_at   timestamptz default now()
);
alter table assets enable row level security;
create policy "Users manage own assets" on assets
  for all using (auth.uid() = user_id);

-- Discovery scans
create table if not exists scans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  asset_id     uuid references assets(id) on delete set null,
  query        text not null,
  status       text not null default 'pending' check (status in ('pending','running','complete','failed')),
  result_count int  default 0,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz default now()
);
alter table scans enable row level security;
create policy "Users see own scans" on scans
  for all using (auth.uid() = user_id);

-- Discovered violations
create table if not exists violations (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid references scans(id) on delete cascade,
  user_id         uuid references profiles(id) on delete cascade,
  url             text not null,
  platform        text,
  title           text,
  snippet         text,
  similarity_score float,
  status          text not null default 'detected'
    check (status in ('detected','reviewing','actioned','dismissed','resolved')),
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);
alter table violations enable row level security;
create policy "Users see own violations" on violations
  for all using (auth.uid() = user_id);

-- Enforcement cases (human-approved only)
create table if not exists cases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade,
  violation_id    uuid references violations(id) on delete set null,
  type            text not null default 'dmca'
    check (type in ('dmca','platform_report','legal_notice')),
  status          text not null default 'draft'
    check (status in ('draft','approved','submitted','acknowledged','resolved','rejected')),
  notice_body     text,
  submitted_at    timestamptz,
  resolved_at     timestamptz,
  created_at      timestamptz default now()
);
alter table cases enable row level security;
create policy "Users manage own cases" on cases
  for all using (auth.uid() = user_id);

-- Immutable audit log (append-only)
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id),
  action      text not null,
  entity      text,
  entity_id   uuid,
  meta        jsonb default '{}',
  ip          text,
  created_at  timestamptz default now()
);
alter table audit_log enable row level security;
-- No update/delete policy — append only
create policy "Users see own audit log" on audit_log
  for select using (auth.uid() = user_id);

-- Revenue impact estimates
create table if not exists impact_estimates (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid references scans(id) on delete cascade,
  user_id         uuid references profiles(id),
  violation_count int not null default 0,
  erosion_monthly numeric(10,2),
  erosion_annual  numeric(10,2),
  created_at      timestamptz default now()
);
alter table impact_estimates enable row level security;
create policy "Users see own estimates" on impact_estimates
  for all using (auth.uid() = user_id);
