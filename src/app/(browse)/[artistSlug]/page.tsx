import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Disc3 } from 'lucide-react';
import RelistenAPI from '@/lib/RelistenAPI';
import BandImage from '@/components/BandImage';
import FavoriteHeart from '@/components/FavoriteHeart';
import { formatNumber } from '@/lib/formatPlays';
import { simplePluralize, splitShowDate } from '@/lib/utils';
import type { Show } from '@/types';

type PageProps = {
  params: Promise<{ artistSlug: string }>;
};

const formatShowDate = (displayDate?: string) => {
  if (!displayDate) return '';
  const [y, m, d] = displayDate.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mi = parseInt(m, 10) - 1;
  return `${months[mi] ?? m} ${parseInt(d, 10)}, ${y}`;
};

const showHref = (artistSlug: string, show: Show) => {
  const { year, month, day } = splitShowDate(show.display_date);
  return `/${artistSlug}/${year}/${month}/${day}`;
};

function ShowRow({ artistSlug, show, index }: { artistSlug: string; show: Show; index: number }) {
  return (
    <Link
      href={showHref(artistSlug, show)}
      prefetch={false}
      className="group flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-gray-50"
    >
      <span className="w-6 shrink-0 text-center text-sm font-bold text-foreground-muted">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold group-hover:text-relisten-700">
          {formatShowDate(show.display_date)}
        </div>
        <div className="truncate text-xs text-foreground-muted">
          {show.venue?.name ?? 'Unknown venue'}
        </div>
      </div>
      <span className="shrink-0 text-xs text-foreground-muted">
        {simplePluralize('tape', show.source_count)}
      </span>
    </Link>
  );
}

/**
 * Spotify-style band page: hero -> popular shows -> browse by year -> recently added.
 * The old 5-column slot browser is nulled out for this route (see slot pages).
 */
export default async function ArtistPage({ params }: PageProps) {
  const { artistSlug } = await params;

  const artists = await RelistenAPI.fetchArtists();
  const artist = artists.find((a) => a.slug === artistSlug);
  if (!artist?.uuid) return notFound();

  const weeklyPlays = artist.popularity?.windows?.['7d']?.plays ?? 0;

  const [topShows, years, recent] = await Promise.all([
    RelistenAPI.fetchTopShows(artistSlug).catch(() => []),
    RelistenAPI.fetchYears(artist.uuid).catch(() => []),
    RelistenAPI.fetchRecentlyAdded(artistSlug).catch(() => []),
  ]);

  const sortedYears = [...years].sort((a, b) => Number(b.year) - Number(a.year));

  return (
    <div className="lg:col-span-5">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-relisten-900 px-6 py-8 text-white sm:px-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-relisten-500/20 blur-2xl"
          />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <BandImage
              name={artist.name ?? ''}
              slug={artist.slug}
              size={200}
              className="rounded-2xl shadow-2xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-relisten-300">
                Band
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                {artist.name}
              </h1>
              <p className="mt-3 text-sm text-white/70">
                {simplePluralize('show', artist.show_count)} ·{' '}
                {simplePluralize('tape', artist.source_count)}
                {weeklyPlays > 0 && <> · {formatNumber(weeklyPlays)} listens this week</>}
              </p>
              <div className="mt-4">
                <FavoriteHeart type="artist" uuid={artist.uuid} />
              </div>
            </div>
          </div>
        </section>

        {/* Popular shows */}
        {topShows.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold tracking-tight">Popular shows</h2>
            <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              {topShows.slice(0, 10).map((show, i) => (
                <ShowRow key={show.uuid ?? show.id} artistSlug={artistSlug} show={show} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Browse by year */}
        {sortedYears.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold tracking-tight">Browse by year</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {sortedYears.map((y) => (
                <Link
                  key={y.uuid ?? y.year}
                  href={`/${artistSlug}/${y.year}`}
                  prefetch={false}
                  className="group rounded-xl bg-white p-4 text-center shadow-sm transition hover:shadow-md"
                >
                  <Disc3 className="mx-auto text-relisten-600" size={28} />
                  <div className="mt-2 text-lg font-black group-hover:text-relisten-700">
                    {y.year}
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {simplePluralize('show', y.show_count)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recently added */}
        {recent.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold tracking-tight">Recently added tapes</h2>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {recent.slice(0, 10).map((show) => (
                <Link
                  key={show.uuid ?? show.id}
                  href={showHref(artistSlug, show)}
                  prefetch={false}
                  className="group w-48 shrink-0 rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <CalendarDays className="text-relisten-600" size={24} />
                  <div className="mt-2 truncate text-sm font-semibold group-hover:text-relisten-700">
                    {formatShowDate(show.display_date)}
                  </div>
                  <div className="truncate text-xs text-foreground-muted">
                    {show.venue?.name ?? 'Unknown venue'}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export const generateMetadata = async (props: PageProps) => {
  const { artistSlug } = await props.params;
  const artists = await RelistenAPI.fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;
  if (!name) return notFound();
  return { title: `${name} | The Lot` };
};
