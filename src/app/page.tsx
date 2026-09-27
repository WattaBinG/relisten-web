import NavBar from '@/components/NavBar';
import RelistenAPI from '@/lib/RelistenAPI';
import BandSearch, { type BandSearchItem } from '@/components/BandSearch';
import HomeHero from '@/components/home/HomeHero';
import TrendingRow, { type TrendingBand } from '@/components/home/TrendingRow';
import BrowseAllBands from '@/components/home/BrowseAllBands';
import FriendsActivity from '@/components/community/FriendsActivity';
import BirthdaysToday from '@/components/home/BirthdaysToday';
import BirthdayTapePromo from '@/components/home/BirthdayTapePromo';
import type { Artist } from '@/types';

/** Refresh at most hourly so "birthdays today" (and trending) stays current. */
export const revalidate = 3600;

const weeklyPlays = (artist: Artist) => artist.popularity?.windows?.['7d']?.plays ?? 0;

const toSearchItem = (a: Artist): BandSearchItem | null =>
  a.name && a.slug ? { name: a.name, slug: a.slug } : null;

/**
 * Homepage: hero -> trending -> A-Z browse.
 * Lives at the root so it does NOT use the (browse) 5-column layout.
 */
export default async function HomePage() {
  const artists = (await RelistenAPI.fetchArtists()).filter(
    (artist) => Number(artist.featured) <= 1
  );

  const trending: TrendingBand[] = [...artists]
    .map((artist) => ({ artist, plays: weeklyPlays(artist) }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);

  const hero = trending[0] ?? null;

  const searchArtists: BandSearchItem[] = artists.flatMap((a) => {
    const item = toSearchItem(a);
    return item ? [item] : [];
  });

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8">
        {hero && <HomeHero artist={hero.artist} weeklyPlays={hero.plays} />}

        {/* Prominent search on smaller screens (the header carries it on desktop) */}
        <div className="lg:hidden">
          <BandSearch artists={searchArtists} variant="hero" />
        </div>

        <TrendingRow bands={trending} />
        <FriendsActivity />
        <BirthdaysToday />
        <BirthdayTapePromo />
        <BrowseAllBands artists={artists} />
      </main>
    </div>
  );
}
