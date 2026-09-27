-- Migration 006: tape_box — the user's personal cassette collection.
-- "Add to tape box" drops a show into your box as a virtual Maxell-style dub.

create table tape_box (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_uuid text not null,
  artist_slug text not null,
  artist_name text not null,
  show_date text not null, -- YYYY-MM-DD
  venue_name text,
  added_at timestamptz not null default now(),
  unique(user_id, show_uuid)
);

alter table tape_box enable row level security;

create policy "tape_box public read"
  on tape_box for select
  using (true);

create policy "tape_box insert own"
  on tape_box for insert
  with check (auth.uid() = user_id);

create policy "tape_box delete own"
  on tape_box for delete
  using (auth.uid() = user_id);

create index tape_box_user_idx on tape_box (user_id, added_at desc);
create index tape_box_show_idx on tape_box (show_uuid);
