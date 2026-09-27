import { NextResponse } from 'next/server';
import { SERVER_API_DOMAIN } from '@/lib/constants';

export const revalidate = 86400; // catalog metadata barely changes; cache a day

interface SourceLite {
  uuid?: string;
  taper?: string;
  description?: string;
  is_soundboard?: boolean;
}

function pad(n: string | number): string {
  return String(n).padStart(2, '0');
}

function toShowPath(artistSlug: string | undefined, displayDate: string | undefined) {
  if (!artistSlug || !displayDate) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(displayDate);
  if (!m) return undefined;
  return `/${artistSlug}/${m[1]}/${pad(m[2])}/${pad(m[3])}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Server-side catalog lookup: resolves a show UUID to human metadata
 * (artist, date, venue, link path) plus a lite source list for tape labels.
 * Client components use this instead of hitting api.relisten.net directly
 * (no CORS dependency, and RelistenAPI throws notFound() on errors).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  if (!UUID_RE.test(uuid)) {
    return NextResponse.json({ error: 'invalid uuid' }, { status: 400 });
  }
  try {
    const [showRes, artistsRes] = await Promise.all([
      fetch(`${SERVER_API_DOMAIN}/api/v3/shows/${uuid}`, { next: { revalidate: 86400 } }),
      fetch(`${SERVER_API_DOMAIN}/api/v3/artists`, { next: { revalidate: 86400 } }),
    ]);
    if (!showRes.ok) {
      return NextResponse.json({ error: 'show not found' }, { status: 404 });
    }
    const show = (await showRes.json()) as {
      artist_uuid?: string;
      display_date?: string;
      date?: string;
      venue?: { name?: string };
      sources?: SourceLite[];
    };
    let artistName: string | undefined;
    let artistSlug: string | undefined;
    if (artistsRes.ok) {
      const artists = (await artistsRes.json()) as { uuid?: string; name?: string; slug?: string }[];
      const artist = artists.find((a) => a.uuid === show.artist_uuid);
      artistName = artist?.name;
      artistSlug = artist?.slug;
    }
    const displayDate = show.display_date ?? show.date ?? undefined;
    return NextResponse.json({
      artistName,
      artistSlug,
      displayDate,
      venueName: show.venue?.name ?? undefined,
      showPath: toShowPath(artistSlug, displayDate),
      sources: (show.sources ?? []).map((s) => ({
        uuid: s.uuid,
        taper: s.taper ?? undefined,
        description: s.description ? s.description.slice(0, 120) : undefined,
        is_soundboard: s.is_soundboard ?? undefined,
      })),
    });
  } catch (e) {
    console.error('show-meta lookup failed', e);
    return NextResponse.json({ error: 'lookup failed' }, { status: 502 });
  }
}
