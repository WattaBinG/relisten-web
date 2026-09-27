import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import CommunitySection from '@/components/community/CommunitySection';

type Props = {
  params: Promise<{ artistSlug: string; year: string; month: string; day: string }>;
};

export default async function ShowDayPage({ params }: Props) {
  const { artistSlug, year, month, day } = await params;
  const date = createShowDate(year, month, day);

  const show = await RelistenAPI.fetchShow(artistSlug, year, date).catch(() => null);
  if (!show?.uuid) return null;

  const artists = await RelistenAPI.fetchArtists().catch(() => null);
  const artistName = artists?.find((a) => a.slug === artistSlug)?.name ?? artistSlug;

  return (
    <div className="min-w-0">
      <CommunitySection
        showUuid={show.uuid}
        artistSlug={artistSlug}
        year={year}
        date={date}
        showTitle={`${artistName} — ${date}`}
      />
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
