-- Couple Therapy Database Schema
-- Run this in Supabase SQL Editor

-- ══════════════════════════════════════
-- PROFILES (extends Supabase auth.users)
-- ══════════════════════════════════════
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════════════════════════
-- COUPLES (partner linking)
-- ══════════════════════════════════════
create table public.couples (
  id uuid default gen_random_uuid() primary key,
  partner_a uuid references public.profiles(id) on delete cascade not null,
  partner_b uuid references public.profiles(id) on delete cascade,
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.couples enable row level security;

create policy "Partners can read own couple"
  on public.couples for select
  using (auth.uid() = partner_a or auth.uid() = partner_b);

create policy "Users can create couples"
  on public.couples for insert
  with check (auth.uid() = partner_a);

create policy "Partners can update own couple"
  on public.couples for update
  using (auth.uid() = partner_a or auth.uid() = partner_b);

-- ══════════════════════════════════════
-- SESSIONS (voice coaching sessions)
-- ══════════════════════════════════════
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  couple_id uuid references public.couples(id) on delete set null,
  mode text not null check (mode in ('together', 'solo-a', 'solo-b')),
  session_type text not null default 'initial' check (session_type in ('initial', 'check-in', 'state-of-union', 'ad-hoc')),
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  duration_seconds integer,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned'))
);

alter table public.sessions enable row level security;

create policy "Users can read own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can create own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

-- ══════════════════════════════════════
-- TRANSCRIPTS (private per user)
-- ══════════════════════════════════════
create table public.transcripts (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.transcripts enable row level security;

-- CRITICAL: Only the owner can see their transcript — never the partner
create policy "Users can only read own transcripts"
  on public.transcripts for select
  using (auth.uid() = user_id);

create policy "Users can create own transcripts"
  on public.transcripts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transcripts"
  on public.transcripts for update
  using (auth.uid() = user_id);

-- ══════════════════════════════════════
-- SYNTHESES (coaching reports)
-- ══════════════════════════════════════
create table public.syntheses (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  couple_id uuid references public.couples(id) on delete set null,
  synthesis_type text not null default 'individual' check (synthesis_type in ('individual', 'combined')),
  data jsonb not null,
  voice_script text,
  created_at timestamptz default now() not null
);

alter table public.syntheses enable row level security;

-- Individual syntheses: only the owner
create policy "Users can read own individual syntheses"
  on public.syntheses for select
  using (
    auth.uid() = user_id
    or (
      synthesis_type = 'combined'
      and couple_id in (
        select id from public.couples
        where partner_a = auth.uid() or partner_b = auth.uid()
      )
    )
  );

create policy "Users can create own syntheses"
  on public.syntheses for insert
  with check (auth.uid() = user_id);

-- ══════════════════════════════════════
-- PLANS (coaching plans)
-- ══════════════════════════════════════
create table public.plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  couple_id uuid references public.couples(id) on delete set null,
  synthesis_id uuid references public.syntheses(id) on delete set null,
  plan_type text not null default '7-day' check (plan_type in ('7-day', 'ongoing', 'custom')),
  starts_at date not null default current_date,
  ends_at date,
  status text not null default 'active' check (status in ('active', 'completed', 'superseded')),
  created_at timestamptz default now() not null
);

alter table public.plans enable row level security;

create policy "Users can read own plans"
  on public.plans for select
  using (auth.uid() = user_id);

create policy "Users can create own plans"
  on public.plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plans"
  on public.plans for update
  using (auth.uid() = user_id);

-- ══════════════════════════════════════
-- PLAN ITEMS (daily actions)
-- ══════════════════════════════════════
create table public.plan_items (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.plans(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_number integer not null,
  scheduled_date date,
  action_type text not null check (action_type in ('exercise', 'ai-session', 'reflection', 'practice')),
  title text not null,
  description text not null,
  why text not null,
  completed boolean default false,
  completed_at timestamptz,
  reflection_notes text,
  linked_session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.plan_items enable row level security;

create policy "Users can read own plan items"
  on public.plan_items for select
  using (auth.uid() = user_id);

create policy "Users can create own plan items"
  on public.plan_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plan items"
  on public.plan_items for update
  using (auth.uid() = user_id);

-- ══════════════════════════════════════
-- DIMENSION SCORES (for longitudinal tracking)
-- ══════════════════════════════════════
create table public.dimension_scores (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  dimension_id text not null,
  dimension_name text not null,
  score integer not null check (score between 1 and 5),
  insight text,
  evidence text,
  created_at timestamptz default now() not null
);

alter table public.dimension_scores enable row level security;

create policy "Users can read own dimension scores"
  on public.dimension_scores for select
  using (auth.uid() = user_id);

create policy "Users can create own dimension scores"
  on public.dimension_scores for insert
  with check (auth.uid() = user_id);

-- Index for fast longitudinal queries
create index idx_dimension_scores_user_dim
  on public.dimension_scores(user_id, dimension_id, created_at);

create index idx_sessions_user
  on public.sessions(user_id, started_at desc);

create index idx_couples_invite
  on public.couples(invite_code) where status = 'pending';
