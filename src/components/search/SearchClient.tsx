'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, Play, Loader2, MapPin } from 'lucide-react';
import BandImage from '@/components/BandImage';
import ShowCard from '@/components/home/ShowCard';
import { splitShowDate } from '@/lib/utils';

type ArtistHit = { name: string; slug: string };
type SongHit = { name: string; slug: string };
type VenueHit = { name: string; location?: string | null };
type ShowHit = {
  display_date: string;
  venue: { name?: string; location?: string | null } | null;
  has_soundboard_source: boolean;
};
type Group = {
  artist: ArtistHit;
  songs: SongHit[];
  venues: VenueHit[];
  shows: ShowHit[];
};
type SearchResponse = { artists: ArtistHit[]; groups: Group[] };

function SongRow({ song, artist }: { song: SongHit; artist: ArtistHit }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const playShow = async () => {
    if (loading || !song.slug) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/song-play-url?artistSlug=${encodeURIComponent(artist.slug)}&songSlug=${encodeURIComponent(song.slug ?? '')}`
      );
      const data = await res.json();
      if (data.url) router.push(data.url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <button
        type="button"
        onClick={playShow}
        aria-label={`Play the show this song came from: ${song.name}`}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-relisten-700 text-white hover:bg-relisten-800"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gray-900">{song.name}</div>
        <div className="truncate text-xs text-gray-500">{artist.name}</div>
      </div>
      <button
        type="button"
        onClick={playShow}
        className="shrink-0 cursor-pointer text-xs font-medium text-relisten-700 hover:underline"
      >
        Play show
      </button>
    </div>
  );
}

/** One search box across artists, songs, shows, and venues. */
export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        setResults(res.ok ? await res.json() : { artists: [], groups: [] });
      } catch {
        setResults({ artists: [], groups: [] });
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const hasResults =
    results &&
    (results.artists.length > 0 ||
      results.groups.some((g) => g.songs.length + g.shows.length + g.venues.length > 0));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Search</h1>
      <div className="relative">
        <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artists, songs, shows, venues…"
          aria-label="Search everything"
          className="w-full rounded-full border border-transparent bg-gray-100 py-3 pr-4 pl-11 text-base text-gray-900 placeholder:text-gray-400 focus:border-relisten-400 focus:bg-white focus:ring-2 focus:ring-relisten-200 focus:outline-none"
        />
      </div>

      <div className="mt-6 space-y-8 pb-8">
        {searching && !results && (
          <p className="text-sm text-gray-400">Searching…</p>
        )}

        {results && !hasResults && !searching && (
          <p className="text-sm text-gray-500">
            No matches for “{query.trim()}”. Try a band, song, venue, or date.
          </p>
        )}

        {results && results.artists.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Artists</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {results.artists.map((a) => (
                <Link
                  key={a.slug}
                  href={`/${a.slug}`}
                  prefetch={false}
                  className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 hover:shadow-md"
                >
                  <BandImage name={a.name} slug={a.slug} size={48} className="!rounded-full" />
                  <span className="truncate text-sm font-semibold group-hover:text-relisten-700">
                    {a.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {results?.groups.map(
          (g) =>
            (g.songs.length > 0 || g.shows.length > 0 || g.venues.length > 0) && (
              <div key={g.artist.slug} className="space-y-6">
                {g.songs.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-lg font-bold">
                      Songs <span className="text-sm font-normal text-gray-400">· {g.artist.name}</span>
                    </h2>
                    <div className="space-y-2">
                      {g.songs.map((s) => (
                        <SongRow key={s.slug || s.name} song={s} artist={g.artist} />
                      ))}
                    </div>
                  </section>
                )}

                {g.shows.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-lg font-bold">
                      Shows <span className="text-sm font-normal text-gray-400">· {g.artist.name}</span>
                    </h2>
                    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                      {g.shows.map((s) => {
                        const { year, month, day } = splitShowDate(s.display_date ?? '');
                        return (
                          <ShowCard
                            key={`${g.artist.slug}-${s.display_date}`}
                            href={`/${g.artist.slug}/${year}/${month}/${day}`}
                            dateLabel={s.display_date ?? ''}
                            venueName={s.venue?.name}
                            location={s.venue?.location}
                            soundboard={s.has_soundboard_source}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {g.venues.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-lg font-bold">
                      Venues <span className="text-sm font-normal text-gray-400">· {g.artist.name}</span>
                    </h2>
                    <div className="space-y-2">
                      {g.venues.map((v) => (
                        <Link
                          key={`${g.artist.slug}-${v.name}`}
                          href={`/${g.artist.slug}`}
                          prefetch={false}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 hover:shadow-md"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            <MapPin size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-gray-900">
                              {v.name}
                            </span>
                            {v.location && (
                              <span className="block truncate text-xs text-gray-500">{v.location}</span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )
        )}
      </div>
    </div>
  );
}
