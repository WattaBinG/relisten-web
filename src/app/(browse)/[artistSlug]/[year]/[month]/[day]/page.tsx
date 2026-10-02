import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import CommunitySection from '@/components/community/CommunitySection';
import VideoBlock from '@/components/community/VideoBlock';
import ShowStoryButton from '@/components/community/ShowStoryButton';
import type { Source } from '@/types';

type Props = {
  params: Promise<{ artistSlug: string; year: string; month: string; day: string }>;
};

const trackCount = (s: Source) =>
  (s.sets ?? []).reduce((n, set) => n + (set.tracks?.length ?? 0), 0);

export default async function ShowDayPage({ params }: Props) {
  const { artistSlug, year, month, day } = await params;
  const date = createShowDate(year, month, day);

  const show = await RelistenAPI.fetchShow(artistSlug, year, date).catch(() => null);
  if (!show?.uuid) return null;

  const artists = await RelistenAPI.fetchArtists().catch(() => null);
  const artistName = artists?.find((a) => a.slug === artistSlug)?.name ?? artistSlug;

  // Setlist for the AI story: song titles from the fullest source.
  const bestSource = [...(show.sources ?? [])].sort((a, b) => trackCount(b) - trackCount(a))[0];
  const setlist = (bestSource?.sets ?? []).flatMap((s) =>
    (s.tracks ?? []).map((t) => t.title).filter((t): t is string => !!t)
  );

  return (
    <div className="min-w-0">
      <div className="mx-auto w-full max-w-2xl px-4 pt-8">
        <ShowStoryButton
          artistName={artistName}
          date={date}
          venueName={show.venue?.name ?? null}
          setlist={setlist}
          showUuid={show.uuid}
        />
      </div>
      <CommunitySection
        showUuid={show.uuid}
        artistSlug={artistSlug}
        year={year}
        date={date}
        showTitle={`${artistName} — ${date}`}
        artistName={artistName}
        venueName={show.venue?.name ?? null}
      />
      <VideoBlock artistSlug={artistSlug} date={date} artistName={artistName} />
    </div>
  );
}

export const generateMetadata = async (props: Props) => {
  const params = await props.params;
  const { artistSlug, year, month, day } = params;

  const artists = await RelistenAPI.fetchArtists();
  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  const show = await RelistenAPI.fetchShow(artistSlug, year, [year, month, day].join('-'));

  return {
    title: [createShowDate(year, month, day), name].join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    openGraph: {
      images: show?.uuid
        ? [{ url: `/api/og?showUuid=${show.uuid}`, width: 550, height: 550 }]
        : [],
    },
  };
};
