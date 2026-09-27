-- Migration 007: playlists (Spotify-style custom playlists across shows)
create table playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 100),
  description text check (char_length(description) <= 500),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists(id) on delete cascade,
  position int not null,
  artist_name text not null,
  artist_slug text not null,
  show_uuid text not null,
  show_date text not null,
  venue_name text,
  source_uuid text not null,
  track_uuid text not null,
  song_title text not null,
  track_position int,
  duration_seconds numeric,
  added_at timestamptz not null default now(),
  unique(playlist_id, position)
);

create index playlist_tracks_playlist_idx on playlist_tracks(playlist_id);

-- RLS
alter table playlists enable row level security;
alter table playlist_tracks enable row level security;

-- playlists: public can read public playlists; owners can read their own
create policy "public read public playlists"
  on playlists for select
  using (is_public = true or auth.uid() = user_id);

-- playlists: owners manage their own
create policy "owners insert own playlists"
  on playlists for insert
  with check (auth.uid() = user_id);
create policy "owners update own playlists"
  on playlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "owners delete own playlists"
  on playlists for delete
  using (auth.uid() = user_id);

-- playlist_tracks: readable when parent playlist is public or owned
create policy "read tracks of visible playlists"
  on playlist_tracks for select
  using (
    exists (
      select 1 from playlists p
      where p.id = playlist_tracks.playlist_id
        and (p.is_public = true or p.user_id = auth.uid())
    )
  );

-- playlist_tracks: writable only by playlist owner
create policy "owners insert tracks"
  on playlist_tracks for insert
  with check (
    exists (
      select 1 from playlists p
      where p.id = playlist_tracks.playlist_id
        and p.user_id = auth.uid()
    )
  );
create policy "owners update tracks"
  on playlist_tracks for update
  using (
    exists (
      select 1 from playlists p
      where p.id = playlist_tracks.playlist_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from playlists p
      where p.id = playlist_tracks.playlist_id
        and p.user_id = auth.uid()
    )
  );
create policy "owners delete tracks"
  on playlist_tracks for delete
  using (
    exists (
      select 1 from playlists p
      where p.id = playlist_tracks.playlist_id
        and p.user_id = auth.uid()
    )
  );
