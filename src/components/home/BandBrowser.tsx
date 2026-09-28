'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import BandCard from './BandCard';
import type { Artist } from '@/types';

const displayName = (a: Artist) => a.sort_name || a.name || '';
const weeklyPlays = (a: Artist) => a.popularity?.windows?.['7d']?.plays ?? 0;

const SORTS = [
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'shows', label: 'Most shows' },
  { id: 'tapes', label: 'Most tapes' },
  { id: 'trending', label: 'Trending now' },
] as const;

type SortId = (typeof SORTS)[number]['id'];

function sortArtists(artists: Artist[], sort: SortId): Artist[] {
  const list = [...artists];
  switch (sort) {
    case 'name-desc':
      return list.sort((a, b) => displayName(b).localeCompare(displayName(a)));
    case 'shows':
      return list.sort((a, b) => (b.show_count ?? 0) - (a.show_count ?? 0));
    case 'tapes':
      return list.sort((a, b) => (b.source_count ?? 0) - (a.source_count ?? 0));
    case 'trending':
      return list.sort((a, b) => weeklyPlays(b) - weeklyPlays(a));
    case 'name-asc':
    default:
      return list.sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }
}

/** Browse-all-bands with a sort control. A–Z keeps the letter-grouped layout. */
export default function BandBrowser({ artists }: { artists: Artist[] }) {
  const [sort, setSort] = useState<SortId>('name-asc');

  const sorted = useMemo(() => sortArtists(artists, sort), [artists, sort]);

  const groups = useMemo(() => {
    if (sort !== 'name-asc') return null;
    const map = new Map<string, Artist[]>();
    for (const artist of sorted) {
      const letter = (displayName(artist)[0] || '#').toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';
      const group = map.get(key);
      if (group) group.push(artist);
      else map.set(key, [artist]);
    }
    return [...map.entries()];
  }, [sorted, sort]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Browse all bands</h2>
        <label className="flex items-center gap-2 text-sm text-foreground-muted">
          <ArrowUpDown className="size-4" aria-hidden="true" />
          <span className="sr-only">Sort bands</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            aria-label="Sort bands"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-foreground focus:border-relisten-500 focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {groups ? (
        <div className="space-y-10">
          {groups.map(([letter, bands]) => (
            <div key={letter}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-foreground-muted">
                {letter}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {bands.map((artist) => (
                  <BandCard key={artist.uuid ?? artist.slug} artist={artist} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sorted.map((artist) => (
            <BandCard key={artist.uuid ?? artist.slug} artist={artist} />
          ))}
        </div>
      )}
    </section>
  );
}
