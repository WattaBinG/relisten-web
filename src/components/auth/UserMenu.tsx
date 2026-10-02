'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Heart,
  ListMusic,
  LogOut,
  Ticket,
  User,
} from 'lucide-react';
import { useCloudAuth } from '@/lib/cloud/auth';
import { isCloudEnabled } from '@/lib/cloud/supabase';

const MENU_ITEMS = [
  { href: '/account', label: 'Profile settings', Icon: User },
  { href: '/favorites', label: 'Favorites', Icon: Heart },
  { href: '/birthday-tape', label: 'My tapes', Icon: Ticket },
  { href: '/playlists', label: 'Playlists', Icon: ListMusic },
];

/**
 * Account menu for the top-right of the header. "Sign in" when anonymous;
 * an avatar/username button with a dropdown (profile settings, favorites,
 * tapes, playlists, sign out) when signed in.
 */
export default function UserMenu() {
  const { status, profile, signOut } = useCloudAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open ]);

  if (!isCloudEnabled) return null;
  if (status === 'loading') return <span className="px-3 text-gray-300">…</span>;
  if (status === 'anon') {
    return (
      <Link
        href="/account"
        prefetch={false}
        className="rounded-full bg-[#5b2f8f] px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-[#4a2575]"
      >
        Sign in
      </Link>
    );
  }

  const username = profile?.username ?? 'Account';
  const initial = (username.trim()[0] ?? '•').toUpperCase();
  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[190px] cursor-pointer items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-gray-100"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/10"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5b2f8f] text-sm font-bold text-white">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[110px] truncate text-sm font-medium text-gray-800 sm:block">
          {username}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          <Link
            href="/account"
            prefetch={false}
            onClick={close}
            title="Profile settings"
            className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 hover:bg-gray-50"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/10"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5b2f8f] text-sm font-bold text-white">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900">{username}</div>
              <div className="text-xs text-gray-400">Signed in — view profile settings</div>
            </div>
          </Link>
          <div className="border-t border-gray-100" />
          <div className="p-1.5">
            {MENU_ITEMS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={close}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                <Icon size={16} className="text-gray-500" />
                {label}
              </Link>
            ))}
          </div>
          <div className="border-t border-gray-100" />
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                close();
                void signOut();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut size={16} className="text-gray-500" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
