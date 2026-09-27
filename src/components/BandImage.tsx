'use client';

import { useEffect, useState } from 'react';

const imgCache = new Map<string, string | null>();

/**
 * Band artwork: real artist photo via /api/artist-image (Deezer),
 * with a styled initials fallback while loading or when none exists.
 */
export default function BandImage({
  name,
  slug,
  size = 56,
  className = '',
}: {
  name: string;
  slug?: string;
  size?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(() => imgCache.get(name.toLowerCase()) ?? null);
  const [tried, setTried] = useState(() => imgCache.has(name.toLowerCase()));

  useEffect(() => {
    const key = name.toLowerCase();
    if (imgCache.has(key)) {
      setUrl(imgCache.get(key) ?? null);
      setTried(true);
      return;
    }
    let alive = true;
    fetch(`/api/artist-image?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const u: string | null = d?.imageUrl ?? null;
        imgCache.set(key, u);
        setUrl(u);
        setTried(true);
      })
      .catch(() => {
        if (!alive) return;
        imgCache.set(key, null);
        setTried(true);
      });
    return () => {
      alive = false;
    };
  }, [name]);

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-lg object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-relisten-700 to-relisten-900 font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {tried ? initials : ''}
    </div>
  );
}
