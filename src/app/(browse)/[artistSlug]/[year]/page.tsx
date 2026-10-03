import RelistenAPI from '@/lib/RelistenAPI';
import { notFound, redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ artistSlug: string; year: string }>;
}) {
  const { artistSlug, year } = await params;
  // Accept phish.net-style dash dates (/phish/1999-12-31) and send them
  // to the real show URL format (/{artist}/{yyyy}/{MM}/{dd}).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(year ?? '');
  if (m) redirect(`/${artistSlug}/${m[1]}/${m[2]}/${m[3]}`);
  return null;
}

function capitalizeFirstLetterOfEachWord(val: string): string {
  if (!val) return '';
  return String(val)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const generateMetadata = async (props) => {
  const params = await props.params;
  const { artistSlug, year } = params;

  const artists = await RelistenAPI.fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  return {
    title: [capitalizeFirstLetterOfEachWord(year?.replaceAll('-', ' ')), name].join(' | '),
  };
};
