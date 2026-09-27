'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCloudAuth } from '@/lib/cloud/auth';
import {
  formatBirthdayMonthDay,
  getMonthDay,
  useFavoriteArtistUuids,
} from '@/lib/cloud/birthday';
import { addTrackToPlaylist, createPlaylist, type NewTrackInput } from '@/lib/cloud/playlists';
import { API_DOMAIN } from '@/lib/constants';

interface CatalogArtist {
  uuid?: string;
  slug?: string;
  name?: string;
}

interface OnDateShow {
  uuid?: string;
  display_date?: string;
  date?: string;
  venue?: { name?: string; location?: string } | null;
  source_count?: number;
}

interface TapeEntry {
  artistSlug: string;
  artistName: string;
  show: OnDateShow;
}

/** Bands to use when the user hasn't favorited anyone yet. */
const FALLBACK_BAND_NAMES = [
  'Phish',
  'Grateful Dead',
  'moe.',
  'Widespread Panic',
  'The Disco Biscuits',
  'Umphreys McGee',
  'The String Cheese Incident',
  'Goose',
];

function showUrl(artistSlug: string, displayDate: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(displayDate ?? '');
  if (!m) return null;
  return `/${artistSlug}/${m[1]}/${m[2]}/${m[3]}`;
}

function formatShowDate(displayDate: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(displayDate ?? '');
  if (!m) return displayDate ?? 'Unknown date';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export default function BirthdayTapePage() {
  const { status, profile, session } = useCloudAuth();
  const { uuids: favUuids, loading: favLoading } = useFavoriteArtistUuids();

  const [entries, setEntries] = useState<TapeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPlaylistId, setSavedPlaylistId] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);

  const monthDay = useMemo(() => getMonthDay(profile?.birthday), [profile?.birthday]);
  const birthdayLabel = useMemo(() => formatBirthdayMonthDay(profile?.birthday), [profile?.birthday]);

  useEffect(() => {
    if (status !== 'authed' || favLoading || !monthDay) {
      if (status === 'authed' && !favLoading && !monthDay) setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // 1. Catalog -> uuid/slug/name map
        const artistsRes = await fetch(`${API_DOMAIN}/api/v3/artists`);
        if (!artistsRes.ok) throw new Error('Could not reach the catalog.');
        const artists = (await artistsRes.json()) as CatalogArtist[];
        const byUuid = new Map<string, CatalogArtist>();
        const byName = new Map<string, CatalogArtist>();
        for (const a of artists) {
          if (a.uuid) byUuid.set(a.uuid, a);
          if (a.name) byName.set(a.name.toLowerCase(), a);
        }

        // 2. Which bands? Favorites first, fallback to the usual suspects.
        let targets: CatalogArtist[] = favUuids
          .map((u) => byUuid.get(u))
          .filter((a): a is CatalogArtist => !!a && !!a.slug);
        if (targets.length === 0) {
          targets = FALLBACK_BAND_NAMES.map((n) => byName.get(n.toLowerCase())).filter(
            (a): a is CatalogArtist => !!a && !!a.slug
          );
        }

        // 3. On-date shows for each band (in parallel, tolerate failures).
        const settled = await Promise.allSettled(
          targets.map(async (a): Promise<TapeEntry[]> => {
            const res = await fetch(
              `${API_DOMAIN}/api/v2/artists/${a.slug}/shows/on-date?month=${monthDay.month}&day=${monthDay.day}`
            );
            if (!res.ok) return [];
            const shows = (await res.json()) as OnDateShow[];
            return shows.map((show) => ({
              artistSlug: a.slug as string,
              artistName: a.name ?? (a.slug as string),
              show,
            }));
          })
        );
        const all: TapeEntry[] = [];
        for (const s of settled) {
          if (s.status === 'fulfilled') all.push(...s.value);
        }
        // Newest first.
        all.sort((x, y) => (y.show.display_date ?? '').localeCompare(x.show.display_date ?? ''));

        if (!cancelled) {
          setEntries(all);
          setSelected(new Set(all.map((e) => e.show.uuid).filter(Boolean) as string[]));
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, favLoading, favUuids, monthDay]);

  const toggle = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const saveAsPlaylist = async () => {
    setSaveError(null);
    setSavedPlaylistId(null);
    const userId = session?.user?.id;
    if (!userId || !birthdayLabel) return;
    const chosen = entries.filter((e) => e.show.uuid && selected.has(e.show.uuid));
    if (chosen.length === 0) {
      setSaveError('Pick at least one show first.');
      return;
    }
    setSaving(true);
    try {
      const playlist = await createPlaylist(userId, `My Birthday Tape — ${birthdayLabel}`);
      if (!playlist) throw new Error('Could not create the playlist.');
      let added = 0;
      for (const entry of chosen) {
        setSaveProgress(`Adding ${entry.artistName} ${entry.show.display_date}…`);
        try {
          const track = await firstTrackOfBestSource(entry);
          if (track && (await addTrackToPlaylist(playlist.id, track))) added++;
        } catch {
          // Skip shows whose sources fail to load — keep going.
        }
      }
      setSaveProgress(null);
      if (added === 0) throw new Error('No tracks could be added — try again later.');
      setSavedPlaylistId(playlist.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || (status === 'authed' && favLoading)) {
    return (
      <div className="content">
        <h1 className="mb-4">🎂 Birthday Tape</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (status !== 'authed') {
    return (
      <div className="content">
        <h1 className="mb-4">🎂 Birthday Tape</h1>
        <p className="text-sm text-gray-600">
          <Link href="/account" className="underline">
            Sign in
          </Link>{' '}
          to build your birthday tape.
        </p>
      </div>
    );
  }

  if (!monthDay) {
    return (
      <div className="content">
        <h1 className="mb-4">🎂 Birthday Tape</h1>
        <p className="text-sm text-gray-600">
          Tell us your birthday first and we will dig up every show your favorite bands played
          on that day.{' '}
          <Link href="/account" className="underline">
            Set it on your account page →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="content">
      <h1 className="mb-2">🎂 Your Birthday Tape</h1>
      <p className="mb-6 text-sm text-gray-600">
        Every show your favorite bands played on <strong>{birthdayLabel}</strong> — in any year.
        Pick the ones you want, then save them as a playlist.
      </p>

      {loading && <p className="text-sm text-gray-500">Digging through the archives…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!loading && !loadError && entries.length === 0 && (
        <p className="text-sm text-gray-600">
          No shows found on {birthdayLabel} for your bands yet. Try favoriting more artists on
          their pages — your tape rebuilds from your favorites.
        </p>
      )}

      {!loading && entries.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAsPlaylist()}
              className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Building…' : `Save ${selected.size} as playlist`}
            </button>
            {saveProgress && <span className="text-xs text-gray-500">{saveProgress}</span>}
          </div>
          {saveError && <p className="mb-4 text-sm text-red-600">{saveError}</p>}
          {savedPlaylistId && (
            <p className="mb-4 text-sm text-green-700">
              Tape saved!{' '}
              <Link href={`/playlists/${savedPlaylistId}`} className="underline">
                Open your playlist →
              </Link>
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const uuid = entry.show.uuid ?? '';
              const url = showUrl(entry.artistSlug, entry.show.display_date);
              const checked = selected.has(uuid);
              return (
                <li
                  key={`${entry.artistSlug}-${uuid}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(uuid)}
                    aria-label={`Include ${entry.artistName} ${entry.show.display_date}`}
                    className="h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {url ? (
                        <Link href={url} className="hover:underline">
                          {entry.artistName} — {formatShowDate(entry.show.display_date)}
                        </Link>
                      ) : (
                        <>
                          {entry.artistName} — {formatShowDate(entry.show.display_date)}
                        </>
                      )}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {entry.show.venue?.name ?? 'Unknown venue'}
                      {entry.show.venue?.location ? ` — ${entry.show.venue.location}` : ''}
                      {entry.show.source_count ? ` · ${entry.show.source_count} tapes` : ''}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/** First track of the highest-rated source for a show (for "Save as playlist"). */
async function firstTrackOfBestSource(entry: TapeEntry): Promise<NewTrackInput | null> {
  const showUuid = entry.show.uuid;
  if (!showUuid) return null;
  const res = await fetch(`${API_DOMAIN}/api/v3/shows/${showUuid}`);
  if (!res.ok) return null;
  const tape = (await res.json()) as {
    sources?: {
      uuid?: string;
      avg_rating?: number | null;
      sets?: { tracks?: { uuid?: string; title?: string; track_position?: number; duration?: number }[] }[];
    }[];
    venue?: { name?: string } | null;
    display_date?: string;
  };
  const sources = tape.sources ?? [];
  if (sources.length === 0) return null;
  const best = [...sources].sort(
    (a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
  )[0];
  const firstTrack = best.sets?.flatMap((s) => s.tracks ?? [])[0];
  if (!best.uuid || !firstTrack?.uuid) return null;
  return {
    artist_name: entry.artistName,
    artist_slug: entry.artistSlug,
    show_uuid: showUuid,
    show_date: entry.show.display_date ?? entry.show.date ?? '',
    venue_name: tape.venue?.name ?? entry.show.venue?.name ?? null,
    source_uuid: best.uuid,
    track_uuid: firstTrack.uuid,
    song_title: firstTrack.title ?? 'Unknown title',
    track_position: firstTrack.track_position ?? null,
    duration_seconds: firstTrack.duration ?? null,
  };
}
