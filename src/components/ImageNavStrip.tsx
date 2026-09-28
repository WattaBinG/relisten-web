'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/today', label: 'Today', img: '/nav/today.webp' },
  { href: '/recently-played', label: 'Tapes', img: '/nav/tapes.webp' },
  { href: '/tape-box', label: 'Tape Box', img: '/nav/tapebox.webp' },
  { href: '/playlists', label: 'Playlists', img: '/nav/playlists.webp' },
  { href: '/favorites', label: 'Favorites', img: '/nav/favorites.webp' },
  { href: '/app', label: 'App', img: '/nav/app.webp' },
  { href: '/about', label: 'About', img: '/nav/about.webp' },
];

/**
 * Centered image-button menu strip rendered below the top nav bar.
 * Groovy tile per section; the active section gets an orange ring.
 */
export default function ImageNavStrip() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="Sections"
      className="border-b border-[#3a1a5e] bg-gradient-to-b from-[#2b1145] to-[#1c0a30]"
    >
      <div className="mx-auto flex max-w-4xl items-stretch justify-start gap-1 overflow-x-auto px-3 py-2 sm:justify-center sm:gap-2 sm:px-4">
        {ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className="group flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-1 transition sm:w-20"
            >
              <span
                className={`overflow-hidden rounded-2xl transition-all ${
                  active
                    ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-[#241038]'
                    : 'ring-1 ring-white/25 group-hover:scale-105 group-hover:ring-orange-300'
                }`}
              >
                <Image
                  src={item.img}
                  alt=""
                  width={96}
                  height={96}
                  className="h-12 w-12 sm:h-14 sm:w-14"
                  priority={false}
                />
              </span>
              <span
                className={`text-[10px] font-semibold tracking-widest uppercase sm:text-[11px] ${
                  active ? 'text-orange-300' : 'text-[#f3e9d2]/80 group-hover:text-white'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
