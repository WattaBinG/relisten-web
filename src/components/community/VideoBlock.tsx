'use client';

import { useEffect, useState } from 'react';

type Video = { id: string; title: string; note?: string };

// Hand-picked videos for famous shows always lead; YouTube search results
// (via /api/show-videos) fill in behind them, de-duplicated.
const CURATED: Record<string, Video[]> = {
  'phish:1999-12-31': [
    { id: 'eQzsso_ixbA', title: 'Full show — Big Cypress', note: 'Full-night fan upload' },
    { id: 'ErV68z-yFSo', title: "NYE countdown into 2000", note: 'Midnight-Sunrise project edit' },
    { id: 'mJ8DLEi9dYE', title: 'Sand → Quadrophonic Toppling', note: 'Fan edit' },
    { id: 'xAC9DzV-tGs', title: 'Heavy Things', note: "ABC's millennium broadcast" },
    { id: 's4vNSCXb3os', title: 'Bug', note: 'Pro-shot fan upload' },
    { id: 'woD5qWVDAUc', title: 'Rock and Roll', note: 'Fan edit' },
  ],
};

function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
      {playing ? (
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="group relative block w-full cursor-pointer"
          aria-label={`Play ${video.title}`}
        >
          <img
            src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
            alt={video.title}
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white transition group-hover:scale-105 group-hover:bg-black/90">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
      <div className="bg-white px-3 py-2">
        <p className="truncate text-sm font-medium text-gray-900">{video.title}</p>
        {video.note && <p className="truncate text-xs text-gray-500">{video.note}</p>}
      </div>
    </div>
  );
}

type ApiVideo = { id: string; title: string; channel?: string };

export default function VideoBlock({
  artistSlug,
  date,
  artistName,
}: {
  artistSlug: string;
  date: string; // YYYY-MM-DD
  artistName: string;
}) {
  const [videos, setVideos] = useState<Video[] | null>(null);

  useEffect(() => {
    let alive = true;
    const curated = CURATED[`${artistSlug}:${date}`] ?? [];
    const params = new URLSearchParams({ artistName, date });
    fetch(`/api/show-videos?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { videos: [] }))
      .then((data) => {
        if (!alive) return;
        const seen = new Set(curated.map((v) => v.id));
        const fromApi: Video[] = ((data.videos ?? []) as ApiVideo[])
          .filter((v) => v?.id && !seen.has(v.id))
          .map((v) => ({ id: v.id, title: v.title, note: v.channel }));
        setVideos([...curated, ...fromApi].slice(0, 9));
      })
      .catch(() => {
        if (alive) setVideos(curated);
      });
    return () => {
      alive = false;
    };
  }, [artistSlug, date, artistName]);

  if (!videos?.length) return null;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pt-8">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-xl font-bold">Videos from this night</h2>
        <span className="ml-auto text-xs text-gray-400">via YouTube</span>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Live footage of {artistName} on {date}, embedded from YouTube and played right here.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </section>
  );
}
