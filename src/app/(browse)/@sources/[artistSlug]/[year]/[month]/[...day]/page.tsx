import TapesColumn from '@/components/TapesColumn';
import ShowStoryButton from '@/components/community/ShowStoryButton';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import type { Source } from '@/types';

const trackCount = (s: Source) =>
  (s.sets ?? []).reduce((n, set) => n + (set.tracks?.length ?? 0), 0);

export default async function SourcesDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string; year: string; month: string; day: string | string[] }>;
}) {
  if (await isMobile()) return null;
  const { artistSlug, year, month, day } = await params;
  // [...day] is a catch-all, so day arrives as an array at runtime.
  const dayStr = Array.isArray(day) ? (day[0] ?? '') : day;
  const date = createShowDate(year, month, dayStr);

  // Fetch show data
  const show = await RelistenAPI.fetchShow(artistSlug, year, date);

  if (!show) return notFound();

  const artists = await RelistenAPI.fetchArtists().catch(() => null);
  const artistName = artists?.find((a) => a.slug === artistSlug)?.name ?? artistSlug;

  // Setlist for the AI story: song titles from the fullest source.
  const bestSource = [...(show.sources ?? [])].sort((a, b) => trackCount(b) - trackCount(a))[0];
  const setlist = (bestSource?.sets ?? []).flatMap((s) =>
    (s.tracks ?? []).map((t) => t.title).filter((t): t is string => !!t)
  );

  return (
    <div className="relisten-column flex min-h-0 flex-1 flex-col break-words">
      {show.uuid ? (
        <div className="px-2 pt-2">
          <ShowStoryButton
            artistName={artistName}
            date={date}
            venueName={show.venue?.name ?? null}
            setlist={setlist}
            showUuid={show.uuid}
          />
        </div>
      ) : null}
      <TapesColumn artistSlug={artistSlug} year={year} month={month} day={dayStr} show={show} />
    </div>
  );
}
