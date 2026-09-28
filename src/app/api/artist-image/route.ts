import { NextRequest, NextResponse } from 'next/server';

/** In-memory cache: band name (lowercased) -> image URL (or null if none). */
const cache = new Map<string, { url: string | null; at: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

const UA = 'TheLot/1.0 (+https://relisten-web.vercel.app)';

/** Deezer's generic grey-silhouette placeholder (empty hash in the URL). */
const isDeezerPlaceholder = (url: string) => /images\/artist\/\//.test(url);

/** Source 1: Deezer artist search (free, no key). */
async function deezerImage(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const artists: Array<{ name?: string; picture_medium?: string }> = data?.data ?? [];
    const key = name.toLowerCase();
    const exact = artists.find((a) => a.name?.toLowerCase() === key);
    const best = exact ?? artists[0];
    const url: string | null = best?.picture_medium ?? null;
    if (!url || isDeezerPlaceholder(url)) return null;
    return url;
  } catch {
    return null;
  }
}

type WikiPage = { title?: string; thumbnail?: { source?: string } };

async function wikiPageImage(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages` +
        `&titles=${encodeURIComponent(title)}&pithumbsize=500&redirects=1&origin=*`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pages: WikiPage[] = Object.values(data?.query?.pages ?? {});
    return pages[0]?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

/** Source 2: Wikipedia page image (free, no key) — great jamband coverage. */
async function wikipediaImage(name: string): Promise<string | null> {
  // Try the name directly first (redirects handle "The ..." variants).
  const direct = await wikiPageImage(name);
  if (direct) return direct;

  // Fall back to Wikipedia search for "<name> band" and take the top hit.
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search` +
        `&srsearch=${encodeURIComponent(name + ' band')}&srlimit=3&origin=*`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hits: Array<{ title?: string }> = data?.query?.search ?? [];
    for (const hit of hits) {
      if (!hit.title) continue;
      const img = await wikiPageImage(hit.title);
      if (img) return img;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/artist-image?name=Phish
 * Returns { imageUrl: string | null } — real artist photo.
 * Chain: Deezer -> Wikipedia -> null (client renders initials tile).
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim();
  if (!name) {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }

  const key = name.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ imageUrl: hit.url });
  }

  const url = (await deezerImage(name)) ?? (await wikipediaImage(name)) ?? null;
  cache.set(key, { url, at: Date.now() });
  return NextResponse.json({ imageUrl: url });
}
