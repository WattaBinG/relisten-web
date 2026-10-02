import NavBar from '@/components/NavBar';
import RelistenAPI from '@/lib/RelistenAPI';
import { getCurrentMonthDay } from '@/lib/timezone';
import { splitShowDate } from '@/lib/utils';
import LiveTrack from '@/components/LiveTrack';
import BirthdayTapePromo from '@/components/home/BirthdayTapePromo';
import ShowShelf from '@/components/home/ShowShelf';
import ShowCard from '@/components/home/ShowCard';
import type { Artist } from '@/types';

/** Refresh at most hourly so "shows on this day" stays current. */
export const revalidate = 3600;

const weeklyPlays = (artist: Artist) => artist.popularity?.windows?.['7d']?.plays ?? 0;

const showHref = (artistSlug: string, displayDate?: string | null) => {
  const { year, month, day } = splitShowDate(displayDate ?? '');
  return `/${artistSlug}/${year}/${month}/${day}`;
};

/**
 * Home: Continue listening -> Shows on this day -> Birthday Tape -> Trending shows.
 */
export default async function HomePage() {
  const [artists, currentMonthDay, history] = await Promise.all([
    RelistenAPI.fetchArtists().catch(() => []),
    getCurrentMonthDay(),
    RelistenAPI.fetchLiveHistory().catch(() => []),
  ]);

  const trendingArtists = [...artists]
    .sort((a, b) => weeklyPlays(b) - weeklyPlays(a))
    .slice(0, 5);

  const [todayShows, trendingShows] = await Promise.all([
    RelistenAPI.fetchTodayShows(currentMonthDay.month, currentMonthDay.day).catch(() => []),
    Promise.all(
      trendingArtists.map(async (artist) => {
        const shows = await RelistenAPI.fetchTopShows(artist.slug).catch(() => []);
        return (shows ?? []).slice(0, 2).map((show) => ({
          show,
          artistSlug: artist.slug as string,
          artistName: artist.name as string,
        }));
      })
    ).then((groups) => groups.flat()),
  ]);

  const recentTracks = (history ?? []).slice(0, 10);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 pt-8 pb-28">
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>

        {recentTracks.length > 0 && (
          <ShowShelf title="Continue listening" actionHref="/recently-played">
            {recentTracks.map((item) => (
              <div key={item.id} className="w-64 shrink-0">
                <LiveTrack {...item} />
              </div>
            ))}
          </ShowShelf>
        )}

        {todayShows.length > 0 && (
          <ShowShelf title="Shows on this day" actionHref="/today">
            {todayShows.slice(0, 12).map((day) => (
              <ShowCard
                key={`${day.artist?.slug}-${day.display_date}`}
                href={showHref(day.artist?.slug ?? '', day.display_date)}
                dateLabel={day.display_date ?? ''}
                venueName={day.venue?.name}
                location={day.venue?.location}
                artistName={day.artist?.name}
              />
            ))}
          </ShowShelf>
        )}

        <section>
          <h2 className="mb-3 text-xl font-bold tracking-tight">Your Birthday Tape</h2>
          <BirthdayTapePromo />
        </section>

        {trendingShows.length > 0 && (
          <ShowShelf title="Trending shows">
            {trendingShows.map(({ show, artistSlug, artistName }) => (
              <ShowCard
                key={`${artistSlug}-${show.display_date}`}
                href={showHref(artistSlug, show.display_date)}
                dateLabel={show.display_date ?? ''}
                venueName={show.venue?.name}
                location={show.venue?.location}
                artistName={artistName}
                soundboard={!!show.has_soundboard_source}
              />
            ))}
          </ShowShelf>
        )}
      </main>
    </div>
  );
}
