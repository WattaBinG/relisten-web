import { NextRequest, NextResponse } from 'next/server';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Resolve the best show playback URL for a song: the song's most notable show
 * (soundboard preferred), playing the song with the whole show queued —
 * i.e. "play the whole show it came from".
 */
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const artistSlug = params.get('artistSlug');
  const songSlug = params.get('songSlug');
  if (!artistSlug || !songSlug) {
    return NextResponse.json({ url: null }, { status: 400 });
  }

  const data = await RelistenAPI.fetchSongShows(artistSlug, songSlug).catch(() => null);
  const shows = (data?.shows ?? []).filter((s) => s.display_date);
  if (!shows.length) {
    return NextResponse.json({ url: null }, { status: 404 });
  }

  const [best] = [...shows].sort(
    (a, b) => Number(b.has_soundboard_source ?? false) - Number(a.has_soundboard_source ?? false)
  );
  const { year, month, day } = splitShowDate(best.display_date ?? '');
  if (!year || !month || !day) {
    return NextResponse.json({ url: null }, { status: 404 });
  }

  return NextResponse.json({ url: `/${artistSlug}/${year}/${month}/${day}/${songSlug}` });
}
