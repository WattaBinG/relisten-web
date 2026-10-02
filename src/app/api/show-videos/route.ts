import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type ShowVideo = {
  id: string;
  title: string;
  channel: string;
  publishedAt?: string;
};

// In-memory cache: "artist|date" -> videos. Keeps us far under YouTube's
// 10k-units/day quota (100 units per search call) on repeated show views.
const cache = new Map<string, { expires: number; videos: ShowVideo[] }>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function ytSearch(apiKey: string, query: string): Promise<ShowVideo[]> {
  const url =
    'https://www.googleapis.com/youtube/v3/search?' +
    new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: '12',
      order: 'relevance',
      q: query,
      key: apiKey,
    });
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .filter((it: any) => it?.id?.videoId && it?.snippet?.title)
    .map((it: any) => ({
      id: String(it.id.videoId),
      title: decodeEntities(String(it.snippet.title)),
      channel: decodeEntities(String(it.snippet.channelTitle ?? '')),
      publishedAt: it.snippet.publishedAt ? String(it.snippet.publishedAt) : undefined,
    }));
}

/** Light relevance pass: prefer date mentions + full shows, demote lessons/reviews. */
function rankVideos(videos: ShowVideo[], artistName: string, date: string): ShowVideo[] {
  const [y, m, d] = date.split('-');
  const dateBits = [
    `${y}-${m}-${d}`,
    `${m}-${d}-${y}`,
    `${m}/${d}/${y.slice(2)}`,
    `${m}-${d}-${y.slice(2)}`,
    `${m}.${d}.${y.slice(2)}`,
  ];
  const artist = artistName.toLowerCase();
  const scored = videos.map((v) => {
    const t = v.title.toLowerCase();
    let score = 0;
    if (t.includes(artist)) score += 2;
    if (dateBits.some((b) => t.includes(b))) score += 4;
    if (/full (show|concert|set)|complete (show|concert)/.test(t)) score += 3;
    if (/\blive\b/.test(t)) score += 1;
    if (/lesson|tutorial|how to play|cover|reaction|review|interview|podcast/.test(t)) score -= 6;
    return { v, score };
  });
  return scored
    .filter((s) => s.score > -4)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.v);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artistName = (searchParams.get('artistName') || '').trim().slice(0, 100);
  const date = (searchParams.get('date') || '').trim();
  if (!artistName || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ videos: [] });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ videos: [] });

  const cacheKey = `${artistName.toLowerCase()}|${date}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    return NextResponse.json({ videos: hit.videos, cached: true });
  }

  try {
    const queries = [`${artistName} ${date} live concert`, `${artistName} ${date}`];
    let videos: ShowVideo[] = [];
    for (const q of queries) {
      videos = await ytSearch(apiKey, q);
      if (videos.length >= 4) break;
    }
    videos = rankVideos(videos, artistName, date).slice(0, 8);
    cache.set(cacheKey, { expires: Date.now() + TTL_MS, videos });
    if (cache.size > MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    return NextResponse.json({ videos });
  } catch (err) {
    console.warn('[show-videos] search failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ videos: [] });
  }
}
