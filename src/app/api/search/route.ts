import { NextRequest, NextResponse } from 'next/server';
import RelistenAPI from '@/lib/RelistenAPI';

export const dynamic = 'force-dynamic';

/**
 * Universal search: artists, songs, shows, venues — all filtered server-side.
 * Artists are matched across the whole catalog; songs/venues/shows are
 * searched within the top matching artists.
 */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ artists: [], groups: [] });
  }

  const artists = await RelistenAPI.fetchArtists().catch(() => []);
  const matched = artists
    .filter((a) => a.name?.toLowerCase().includes(q))
    .slice(0, 8);

  const groups = await Promise.all(
    matched.slice(0, 4).map(async (artist) => {
      const [songs, venues, shows] = await Promise.all([
        RelistenAPI.fetchSongs(artist.slug).catch(() => []),
        RelistenAPI.fetchVenues(artist.slug).catch(() => []),
        RelistenAPI.fetchTopShows(artist.slug).catch(() => []),
      ]);
      return {
        artist: { name: artist.name, slug: artist.slug },
        songs: (songs ?? [])
          .filter((s) => s.name?.toLowerCase().includes(q))
          .slice(0, 5)
          .map((s) => ({ name: s.name ?? 'Unknown song', slug: s.slug ?? '' })),
        venues: (venues ?? [])
          .filter((v) => (v.name ?? '').toLowerCase().includes(q))
          .slice(0, 5)
          .map((v) => ({ name: v.name ?? 'Unknown venue', location: v.location ?? null })),
        shows: (shows ?? [])
          .filter((s) =>
            `${s.venue?.name ?? ''} ${s.display_date ?? ''}`.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .map((s) => ({
            display_date: s.display_date,
            venue: s.venue ? { name: s.venue.name, location: s.venue.location } : null,
            has_soundboard_source: !!s.has_soundboard_source,
          })),
      };
    })
  );

  return NextResponse.json({
    artists: matched.map((a) => ({ name: a.name, slug: a.slug })),
    groups,
  });
}
