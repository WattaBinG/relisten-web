import RelistenAPI from '@/lib/RelistenAPI';
import BandSearch, { type BandSearchItem } from '@/components/BandSearch';
import HomeHero from '@/components/home/HomeHero';
import TrendingRow, { type TrendingBand } from '@/components/home/TrendingRow';
import BrowseAllBands from '@/components/home/BrowseAllBands';
import type { Artist } from '@/types';

const weeklyPlays = (artist: Artist) => artist.popularity?.windows?.['7d']?.plays ?? 0;

const toSearchItem = (a: Artist): BandSearchItem | null =>
  a.name && a.slug ? { name: a.name, slug: a.slug } : null;

/**
 * Homepage: hero -> trending -> A-Z browse. Renders as the `children` slot of
 * the (browse) layout and spans the full grid width (lg:col-span-5); the
 * column slots render nothing on `/`.
 */
export default async function HomePage() {
  const artists = (await RelistenAPI.fetchArtists()).filter(
    (artist) => Number(artist.featured) <= 1
  );

  const trending: TrendingBand[] = [...artists]
    .map((artist) => ({ artist, plays: weeklyPlays(artist) }))
    .sort((x, y) => y.plays - x.plays)
    .slice(0, 10);

  const hero = trending[0];

  const searchArtists = artists.flatMap((a) => {
    const item = toSearchItem(a);
    return item ? [item] : [];
  });

  return (
    <div className="lg:col-span-5">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-1 py-8">
        {hero && <HomeHero artist={hero.artist} weeklyPlays={hero.plays} />}

        {/* Prominent search on smaller screens (the header carries it on desktop) */}
        <div className="lg:hidden">
          <BandSearch artists={searchArtists} variant="hero" />
        </div>

        <TrendingRow bands={trending} />
        <BrowseAllBands artists={artists} />
      </div>
    </div>
  );
}
