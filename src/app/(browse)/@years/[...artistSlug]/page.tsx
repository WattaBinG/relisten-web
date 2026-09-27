import YearsColumn from '@/components/YearsColumn';

export default async function YearsArtistSlot({ params }) {
  const slugs = (await params).artistSlug ?? [];
  // Band overview (/:artistSlug) uses the new Spotify-style page — the old
  // years column only renders on deeper routes (/:artistSlug/:year/...).
  if (slugs.length <= 1) return null;
  return <YearsColumn artistSlug={slugs} />;
}
