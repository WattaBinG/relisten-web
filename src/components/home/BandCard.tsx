import Link from 'next/link';
import FavoriteHeart from '@/components/FavoriteHeart';
import { simplePluralize } from '@/lib/utils';
import type { Artist } from '@/types';

/** Simple band card: name, show/tape counts, favorite heart. No stats matrix. */
export default function BandCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/${artist.slug}`}
      prefetch={false}
      className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-relisten-500 hover:shadow-sm"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground group-hover:text-relisten-700">
          {artist.name}
        </div>
        <div className="mt-0.5 text-xs text-foreground-muted">
          {simplePluralize('show', artist.show_count)} · {simplePluralize('tape', artist.source_count)}
        </div>
      </div>
      <FavoriteHeart type="artist" uuid={artist.uuid} />
    </Link>
  );
}
