'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library } from 'lucide-react';
import cn from '@/lib/cn';

const ITEMS = [
  { href: '/', label: 'Home', Icon: Home, exact: true },
  { href: '/search', label: 'Search', Icon: Search },
  { href: '/library', label: 'Library', Icon: Library },
];

/**
 * Spotify-style bottom navigation: Home, Search, Library.
 * Fixed to the viewport bottom on all viewports; hidden on embeds.
 */
export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed')) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === '/' : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                active ? 'text-relisten-700' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
