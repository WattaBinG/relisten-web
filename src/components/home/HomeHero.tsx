import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
    <section className="relative overflow-hidden rounded-2xl bg-relisten-900 px-6 py-10 text-white sm:px-10 sm:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-relisten-500/20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-24 size-72 rounded-full bg-relisten-400/10 blur-2xl"
      />
      <p className="relative text-xs font-semibold tracking-[0.2em] text-relisten-200 uppercase">
        {weeklyPlays > 0 ? 'Trending #1 this week' : 'Featured band'}
      </p>
      <h1 className="relative mt-3 text-4xl font-black tracking-tight sm:text-6xl">
        {artist.name}
      </h1>
      <p className="relative mt-3 text-sm text-relisten-100">
        {simplePluralize('show', artist.show_count)} · {simplePluralize('tape', artist.source_count)}
        {weeklyPlays > 0 && <> · {formatNumber(weeklyPlays)} listens this week</>}
      </p>
      <Link
        href={`/${artist.slug}`}
        prefetch={false}
        className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-relisten-900 transition hover:bg-relisten-50"
      >
        Explore shows <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
