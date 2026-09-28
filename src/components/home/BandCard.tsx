'use client';

import Link from 'next/link';
import FavoriteHeart from '@/components/FavoriteHeart';
import BandImage from '@/components/BandImage';
import { simplePluralize } from '@/lib/utils';
import type { Artist } from '@/types';

/** Spotify-style band card: artwork, name, show/tape counts, favorite heart. */
export default function BandCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/${artist.slug}`}
      prefetch={false}
      className="group flex flex-col rounded-xl bg-white p-3 transition hover:bg-gray-50 hover:shadow-md"
    >
      <div className="relative">
        <BandImage name={artist.name ?? ''} slug={artist.slug} size={160} className="w-full !h-auto aspect-square" />
        <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
          <FavoriteHeart type="artist" uuid={artist.uuid} />
        </div>
      </div>
      <div className="mt-3 min-w-0 px-1 pb-1">
        <div className="truncate text-sm font-semibold text-foreground group-hover:text-relisten-700">
          {artist.name}
        </div>
        <div className="mt-0.5 text-xs text-foreground-muted">
          {simplePluralize('show', artist.show_count)} · {simplePluralize('tape', artist.source_count)}
        </div>
      </div>
    </Link>
  );
}
