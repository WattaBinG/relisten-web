-- Link tape ratings to their show so profiles/activity can show real show
-- names instead of raw source UUIDs. Nullable: older rows are backfilled
-- where the show is known; unknown stays null and UI falls back to "a tape".
alter table source_ratings
  add column if not exists show_uuid uuid;

create index if not exists source_ratings_show_idx on source_ratings (show_uuid);
