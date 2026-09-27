import Link from 'next/link';
import FavoriteHeart from '@/components/FavoriteHeart';
import { formatNumber } from '@/lib/formatPlays';
import { simplePluralize } from '@/lib/utils';
import type { Artist } from '@/types';

export type TrendingBand = { artist: Artist; plays: number };

export default function TrendingRow({ bands }: { bands: TrendingBand[] }) {
  if (!bands.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">Trending this week</h2>
        <span className="text-xs text-foreground-muted">by listens</span>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {bands.map(({ artist, plays }, i) => (
          <Link
            key={artist.uuid ?? artist.slug}
            href={`/${artist.slug}`}
            prefetch={false}
            className="group flex w-56 shrink-0 flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-relisten-500 hover:shadow-md"
          >
            <div>
              <div className="text-xs font-bold text-relisten-600">#{i + 1}</div>
              <div className="mt-1 truncate font-semibold group-hover:text-relisten-700">
                {artist.name}
              </div>
              <div className="mt-1 text-xs text-foreground-muted">
                {simplePluralize('show', artist.show_count)} ·{' '}
                {simplePluralize('tape', artist.source_count)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground-muted">
                {formatNumber(plays)} listens
              </span>
              <FavoriteHeart type="artist" uuid={artist.uuid} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
