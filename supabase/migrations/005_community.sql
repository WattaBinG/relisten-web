-- Migration 005: community layer (check-ins, ratings, reviews, follows)
-- Run via Supabase Management API or psql.

-- "I was there" check-ins per show (show_uuid = catalog API show uuid)
create table if not exists show_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_uuid text not null,
  created_at timestamptz not null default now(),
  unique(user_id, show_uuid)
);
create index if not exists show_checkins_show_idx on show_checkins (show_uuid);
create index if not exists show_checkins_user_idx on show_checkins (user_id);

-- Star ratings (1-5) per tape/source (source_uuid = catalog API source uuid)
create table if not exists source_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_uuid text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_uuid)
);
create index if not exists source_ratings_source_idx on source_ratings (source_uuid);
create index if not exists source_ratings_user_idx on source_ratings (user_id);

-- Fan reviews per show (phish.net-style, up to 2000 chars)
create table if not exists show_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_uuid text not null,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists show_comments_show_idx on show_comments (show_uuid);
create index if not exists show_comments_user_idx on show_comments (user_id);

-- Follow relationships (one-way, like Twitter/Instagram)
create table if not exists follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);
create index if not exists follows_follower_idx on follows (follower_id);
create index if not exists follows_following_idx on follows (following_id);

-- RLS
alter table show_checkins enable row level security;
alter table source_ratings enable row level security;
alter table show_comments enable row level security;
alter table follows enable row level security;

-- Public read for all community tables
drop policy if exists "public read" on show_checkins;
create policy "public read" on show_checkins for select using (true);
drop policy if exists "public read" on source_ratings;
create policy "public read" on source_ratings for select using (true);
drop policy if exists "public read" on show_comments;
create policy "public read" on show_comments for select using (true);
drop policy if exists "public read" on follows;
create policy "public read" on follows for select using (true);

-- Check-ins: users manage their own
drop policy if exists "own checkin insert" on show_checkins;
create policy "own checkin insert" on show_checkins for insert
  with check (auth.uid() = user_id);
drop policy if exists "own checkin delete" on show_checkins;
create policy "own checkin delete" on show_checkins for delete
  using (auth.uid() = user_id);

-- Ratings: users upsert their own
drop policy if exists "own rating insert" on source_ratings;
create policy "own rating insert" on source_ratings for insert
  with check (auth.uid() = user_id);
drop policy if exists "own rating update" on source_ratings;
create policy "own rating update" on source_ratings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rating delete" on source_ratings;
create policy "own rating delete" on source_ratings for delete
  using (auth.uid() = user_id);

-- Reviews: users manage their own
drop policy if exists "own review insert" on show_comments;
create policy "own review insert" on show_comments for insert
  with check (auth.uid() = user_id);
drop policy if exists "own review update" on show_comments;
create policy "own review update" on show_comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own review delete" on show_comments;
create policy "own review delete" on show_comments for delete
  using (auth.uid() = user_id);

-- Follows: users manage their own follower rows
drop policy if exists "own follow insert" on follows;
create policy "own follow insert" on follows for insert
  with check (auth.uid() = follower_id);
drop policy if exists "own follow delete" on follows;
create policy "own follow delete" on follows for delete
  using (auth.uid() = follower_id);
