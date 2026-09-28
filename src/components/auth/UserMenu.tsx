'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronDown,
  Heart,
  ListMusic,
  LogOut,
  Ticket,
  User,
} from 'lucide-react';
import * as Popover from '../Popover';
import { useCloudAuth } from '@/lib/cloud/auth';
import { isCloudEnabled } from '@/lib/cloud/supabase';

const MENU_ITEMS = [
  { href: '/account', label: 'Profile settings', Icon: User },
  { href: '/favorites', label: 'Favorites', Icon: Heart },
  { href: '/birthday-tape', label: 'My tapes', Icon: Ticket },
  { href: '/playlists', label: 'Playlists', Icon: ListMusic },
];

/**
 * Account menu pinned to the left side of the header. "Sign in" when
 * anonymous; an avatar/username button with a dropdown (profile settings,
 * favorites, tapes, playlists, sign out) when signed in.
 */
export default function UserMenu() {
  const { status, profile, signOut } = useCloudAuth();
  const [open, setOpen] = useState(false);

  if (!isCloudEnabled) return null;
  if (status === 'loading') return <span className="nav-btn opacity-40">…</span>;
  if (status === 'anon') {
    return (
      <Link className="nav-btn" href="/account" prefetch={false}>
        Sign in
      </Link>
    );
  }

  const username = profile?.username ?? 'Account';
  const initial = (username.trim()[0] ?? '•').toUpperCase();
  const close = () => setOpen(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex max-w-[180px] cursor-pointer items-center gap-1.5 rounded-full py-1 pr-1 pl-1 hover:bg-gray-100"
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
          <span className="hidden max-w-[96px] truncate text-sm font-medium text-gray-800 md:block">
            {username}
          </span>
          <ChevronDown size={14} className="shrink-0 text-gray-500" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50 w-60 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
        >
          <div className="px-3 pt-2 pb-1.5">
            <div className="truncate text-sm font-semibold text-gray-900">{username}</div>
            <div className="text-xs text-gray-400">Signed in</div>
          </div>
          <div className="my-1 border-t border-gray-100" />
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
          <div className="my-1 border-t border-gray-100" />
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
