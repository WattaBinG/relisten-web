'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useCloudAuth } from '@/lib/cloud/auth';
import { useFavorites, type FavoriteEntityType } from '@/lib/cloud/favorites';
import { isCloudEnabled } from '@/lib/cloud/supabase';
import cn from '@/lib/cn';

interface FavoriteHeartProps {
  type: FavoriteEntityType;
  uuid?: string | null;
  className?: string;
}

/**
 * Heart toggle that writes to the user's cloud favorites. Safe to render
 * inside a Row link — the click never navigates. When signed out, tapping
 * it sends you to the sign-in page instead.
 */
export default function FavoriteHeart({ type, uuid, className }: FavoriteHeartProps) {
  const router = useRouter();
  const { status } = useCloudAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!isCloudEnabled) return null;

  const fav = isFavorite(type, uuid);

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== 'authed') {
      router.push('/account');
      return;
    }
    void toggleFavorite(type, uuid);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={fav}
      title={
        status !== 'authed'
          ? 'Sign in to save favorites'
          : fav
            ? 'Remove from favorites'
            : 'Save to favorites'
      }
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full p-1 transition-colors',
        fav ? 'text-red-500 hover:text-red-600' : 'text-gray-300 hover:text-red-400',
        className
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={fav ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
