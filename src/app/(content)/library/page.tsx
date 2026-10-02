import Link from 'next/link';
import { ListMusic, Heart, Package, Ticket, ChevronRight } from 'lucide-react';

export const metadata = {
  title: 'Your Library',
};

const SECTIONS = [
  {
    href: '/playlists',
    label: 'Playlists',
    blurb: 'Mixtapes you built from any show, any track',
    Icon: ListMusic,
  },
  {
    href: '/favorites',
    label: 'Favorites',
    blurb: 'Bands and shows you hearted',
    Icon: Heart,
  },
  {
    href: '/tape-box',
    label: 'Tape Box',
    blurb: 'Your personal cassette collection',
    Icon: Package,
  },
  {
    href: '/birthday-tape',
    label: 'My tapes',
    blurb: 'Birthday tapes and show intel',
    Icon: Ticket,
  },
];

/** Library: single entry point for playlists, favorites, tape box, tapes. */
export default function LibraryPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Your Library</h1>
      <div className="space-y-3">
        {SECTIONS.map(({ href, label, blurb, Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-relisten-700 text-white">
              <Icon size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-gray-900">{label}</span>
              <span className="block truncate text-sm text-gray-500">{blurb}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-gray-300 group-hover:text-gray-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
