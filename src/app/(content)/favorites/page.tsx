'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import FavoriteHeart from '@/components/FavoriteHeart';
import { useCloudAuth } from '@/lib/cloud/auth';
import { useFavorites, type FavoriteEntityType, type FavMap } from '@/lib/cloud/favorites';
import { isCloudEnabled } from '@/lib/cloud/supabase';
import { API_DOMAIN } from '@/lib/constants';
import { splitShowDate } from '@/lib/utils';
import type { Artist, Tape } from '@/types';

interface ResolvedShow {
  uuid: string;
  displayDate: string;
  venueName?: string;
  venueLocation?: string;
  artistUuid?: string;
  missing: boolean;
}

const OTHER_LABELS: Record<string, string> = {
  source: 'Tapes',
  source_track: 'Tracks',
  song: 'Songs',
  venue: 'Venues',
  tour: 'Tours',
  year: 'Years',
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function FavoritesPage() {
  const { status, profile } = useCloudAuth();
  const { ready, favorites } = useFavorites();
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [shows, setShows] = useState<Record<string, ResolvedShow>>({});

  const keys = useMemo(() => {
    const out: Record<FavoriteEntityType, string[]> = {
      artist: [],
      show: [],
      source: [],
      source_track: [],
      song: [],
      venue: [],
      tour: [],
      year: [],
    };
    for (const [key, val] of Object.entries(favorites) as [string, FavMap[string]][]) {
      if (!val.isFavorite) continue;
      const sep = key.indexOf(':');
      const type = key.slice(0, sep) as FavoriteEntityType;
      const uuid = key.slice(sep + 1);
      if (out[type]) out[type].push(uuid);
    }
    return out;
  }, [favorites]);

  // Resolve artist names/slugs once.
  useEffect(() => {
    if (status !== 'authed' || keys.artist.length === 0) return;
    let cancelled = false;
    fetchJson<Artist[]>(`${API_DOMAIN}/api/v3/artists`).then((data) => {
      if (!cancelled && data) setArtists(data);
    });
    return () => {
      cancelled = true;
    };
  }, [status, keys.artist.length]);

  // Resolve show details (date, venue, artist) per favorited show uuid.
  useEffect(() => {
    if (status !== 'authed') return;
    const missing = keys.show.filter((uuid) => !shows[uuid]);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (uuid) => {
        const show = await fetchJson<Tape>(`${API_DOMAIN}/api/v3/shows/${uuid}`);
        if (!show || !show.display_date)
          return { uuid, displayDate: '', missing: true } satisfies ResolvedShow;
        return {
          uuid,
          displayDate: show.display_date,
          venueName: show.venue?.name,
          venueLocation: show.venue?.location,
          artistUuid: show.artist_uuid,
          missing: false,
        } satisfies ResolvedShow;
      })
    ).then((resolved) => {
      if (cancelled) return;
      setShows((prev) => {
        const next = { ...prev };
        for (const r of resolved) next[r.uuid] = r;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, keys.show.join(',')]);

  if (!isCloudEnabled) {
    return (
      <div className="content">
        <h1 className="mb-4">Favorites</h1>
        <p>Favorites sync isn’t configured on this deployment yet.</p>
      </div>
    );
  }

  if (status === 'loading' || !ready) {
    return (
      <div className="content">
        <h1 className="mb-4">Favorites</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (status === 'anon') {
    return (
      <div className="content">
        <h1 className="mb-4">Favorites</h1>
        <p>
          <Link href="/account">Sign in</Link> to see the favorites you’ve saved on The Lot — on
          your phone or right here.
        </p>
      </div>
    );
  }

  const artistByUuid = new Map((artists ?? []).map((a) => [a.uuid, a]));
  const favArtists = keys.artist
    .map((uuid) => ({ uuid, artist: artistByUuid.get(uuid) }))
    .sort((a, b) => (a.artist?.name ?? '').localeCompare(b.artist?.name ?? ''));
  const favShows = keys.show
    .map((uuid) => shows[uuid])
    .filter(Boolean)
    .sort((a, b) => (b?.displayDate ?? '').localeCompare(a?.displayDate ?? ''));
  const otherTypes = (Object.keys(OTHER_LABELS) as FavoriteEntityType[]).filter(
    (t) => keys[t].length > 0
  );
  const total = favArtists.length + favShows.length + otherTypes.reduce((n, t) => n + keys[t].length, 0);

  const showHref = (s: ResolvedShow): string | null => {
    const artist = (artists ?? []).find((a) => a.uuid === s.artistUuid);
    if (!artist?.slug || !s.displayDate) return null;
    const { year, month, day } = splitShowDate(s.displayDate);
    if (!year || !month || !day) return null;
    return `/${artist.slug}/${year}/${month}/${day}`;
  };

  return (
    <div className="content">
      <h1 className="mb-4">Favorites</h1>
      <p className="text-sm text-gray-600">
        Saved as <strong>{profile?.username}</strong> — synced across The Lot on every device.
      </p>

      {total === 0 && (
        <p className="mt-4">
          Nothing saved yet. Tap the <span className="text-red-500">♥</span> on any band or show
          to keep it here.
        </p>
      )}

      {favArtists.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-medium">Bands</h2>
          <ul className="divide-y divide-gray-100">
            {favArtists.map(({ uuid, artist }) => (
              <li key={uuid} className="flex items-center justify-between py-2">
                {artist?.slug ? (
                  <Link href={`/${artist.slug}`} prefetch={false} className="hover:underline">
                    {artist.name}
                  </Link>
                ) : (
                  <span className="text-gray-500">Loading…</span>
                )}
                <FavoriteHeart type="artist" uuid={uuid} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {favShows.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-medium">Shows</h2>
          <ul className="divide-y divide-gray-100">
            {favShows.map((s) =>
              s ? (
                <li key={s.uuid} className="flex items-center justify-between py-2">
                  <div>
                    {showHref(s) ? (
                      <Link href={showHref(s)!} prefetch={false} className="hover:underline">
                        {s.displayDate}
                      </Link>
                    ) : (
                      <span className={s.missing ? 'text-gray-400' : ''}>
                        {s.missing ? 'Unavailable show' : s.displayDate}
                      </span>
                    )}
                    {s.venueName && (
                      <div className="text-xs text-gray-500">
                        {s.venueName}
                        {s.venueLocation ? ` — ${s.venueLocation}` : ''}
                      </div>
                    )}
                  </div>
                  <FavoriteHeart type="show" uuid={s.uuid} />
                </li>
              ) : null
            )}
          </ul>
        </section>
      )}

      {otherTypes.map((t) => (
        <section key={t} className="mt-6">
          <h2 className="mb-2 text-lg font-medium">{OTHER_LABELS[t]}</h2>
          <ul className="divide-y divide-gray-100">
            {keys[t].map((uuid) => (
              <li key={uuid} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">{uuid}</span>
                <FavoriteHeart type={t} uuid={uuid} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
