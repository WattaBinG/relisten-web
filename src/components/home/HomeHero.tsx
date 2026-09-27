import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BandImage from '@/components/BandImage';
import { formatNumber } from '@/lib/formatPlays';
import { simplePluralize } from '@/lib/utils';
import type { Artist } from '@/types';

export default function HomeHero({
  artist,
  weeklyPlays,
}: {
  artist: Artist;
  weeklyPlays: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-relisten-900 px-6 py-8 text-white sm:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-relisten-500/20 blur-2xl"
      />
      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <BandImage
          name={artist.name ?? ''}
          slug={artist.slug}
          size={160}
          className="rounded-2xl shadow-2xl"
        />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-relisten-300">
            Trending #1 this week
          </p>
          <h1 className="mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">
            {artist.name}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {simplePluralize('show', artist.show_count)} ·{' '}
            {simplePluralize('tape', artist.source_count)} ·{' '}
            {formatNumber(weeklyPlays)} listens this week
          </p>
          <Link
            href={`/${artist.slug}`}
            prefetch={false}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-relisten-900 transition hover:bg-relisten-100"
          >
            Explore shows <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
