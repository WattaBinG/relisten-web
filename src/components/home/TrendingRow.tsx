import Link from 'next/link';
import FavoriteHeart from '@/components/FavoriteHeart';
import BandImage from '@/components/BandImage';
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
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {bands.map(({ artist, plays }, i) => (
          <Link
            key={artist.uuid ?? artist.slug}
            href={`/${artist.slug}`}
            prefetch={false}
            className="group w-40 shrink-0 rounded-xl bg-white p-3 transition hover:bg-gray-50 hover:shadow-md"
          >
            <div className="relative">
              <BandImage name={artist.name ?? ''} slug={artist.slug} size={144} className="w-full !h-auto aspect-square" />
              <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                #{i + 1}
              </div>
            </div>
            <div className="mt-3 min-w-0 px-1 pb-1">
              <div className="truncate text-sm font-semibold group-hover:text-relisten-700">
                {artist.name}
              </div>
              <div className="mt-0.5 text-xs text-foreground-muted">
                {formatNumber(plays)} listens this week
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-foreground-muted">
                  {simplePluralize('show', artist.show_count)}
                </span>
                <FavoriteHeart type="artist" uuid={artist.uuid} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
