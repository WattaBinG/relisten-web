import { NextRequest, NextResponse } from 'next/server';

/** In-memory cache: band name (lowercased) -> image URL (or null if none). */
const cache = new Map<string, { url: string | null; at: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * GET /api/artist-image?name=Phish
 * Returns { imageUrl: string | null } — real artist photo from Deezer (free, no key).
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

  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error(`deezer ${res.status}`);
    const data = await res.json();
    const artists: Array<{ name: string; picture_medium?: string }> = data?.data ?? [];

    // Prefer an exact (case-insensitive) name match, else take the top result.
    const exact = artists.find((a) => a.name?.toLowerCase() === key);
    const best = exact ?? artists[0];
    const raw: string | null = best?.picture_medium ?? null;
    // Deezer returns a generic grey-silhouette placeholder (empty image hash)
    // for artists with no photo — treat it as "no image" so the initials
    // fallback renders instead.
    const url: string | null =
      raw && !/images\/artist\/\//.test(raw) && !/250x250-000000-80-0-0/.test(raw)
        ? raw
        : null;

    cache.set(key, { url, at: Date.now() });
    return NextResponse.json({ imageUrl: url });
  } catch {
    cache.set(key, { url: null, at: Date.now() });
    return NextResponse.json({ imageUrl: null });
  }
}
