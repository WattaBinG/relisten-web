'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useCloudAuth } from './auth';
import {
  getSupabase,
  isCloudEnabled,
  type FavoriteEntityType,
  type FavoriteRow,
} from './supabase';

export type { FavoriteEntityType };

interface FavState {
  isFavorite: boolean;
  updatedAt: number;
}

/** Keyed by "entity_type:entity_uuid", mirroring the mobile sync engine. */
export type FavMap = Record<string, FavState>;

const favKey = (type: FavoriteEntityType, uuid: string) => `${type}:${uuid}`;
const cacheKey = (userId: string) => `thelot.favCache.${userId}.v1`;

interface FavoritesContextValue {
  /** True once the initial cloud pull has finished (or cloud is off). */
  ready: boolean;
  favorites: FavMap;
  isFavorite: (type: FavoriteEntityType, uuid?: string | null) => boolean;
  toggleFavorite: (type: FavoriteEntityType, uuid?: string | null) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Keeps the signed-in user's cloud favorites in client state.
 *
 * - On sign-in: pull the whole favorites table (it's small) and reconcile
 *   against local state. Cloud wins on conflict (compare updated_at), same
 *   as the mobile app.
 * - Every toggle upserts immediately. Unfavorites are kept as tombstone
 *   rows (is_favorite=false) — never deleted — so they sync too.
 * - entity_uuid values are the catalog API's stable UUIDs, identical to
 *   what the mobile app stores, so favorites follow users phone <-> browser.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { status, session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [favs, setFavs] = useState<FavMap>({});
  const [ready, setReady] = useState(false);
  /** Last local write per key — lets pulls apply cloud-wins correctly. */
  const localWriteAt = useRef<Record<string, number>>({});
  const pulledFor = useRef<string | null>(null);

  // Pull on sign-in.
  useEffect(() => {
    if (!isCloudEnabled || status !== 'authed' || !userId) {
      if (status === 'anon') {
        setFavs({});
        localWriteAt.current = {};
        pulledFor.current = null;
        setReady(true);
      }
      return;
    }
    if (pulledFor.current === userId) return;
    pulledFor.current = userId;
    setReady(false);
    let cancelled = false;

    // Instant paint from the per-user cache, then reconcile with cloud.
    try {
      const raw = localStorage.getItem(cacheKey(userId));
      if (raw) {
        const cached = JSON.parse(raw) as FavMap;
        setFavs(cached);
        for (const [key, val] of Object.entries(cached)) {
          localWriteAt.current[key] = Math.max(localWriteAt.current[key] ?? 0, val.updatedAt);
        }
      }
    } catch {
      /* corrupted cache — pull will repair it */
    }

    (async () => {
      const { data, error } = await getSupabase()
        .from('favorites')
        .select('entity_type,entity_uuid,is_favorite,updated_at')
        .eq('user_id', userId);
      if (cancelled) return;
      if (error) {
        console.warn('[cloud-sync] favorite pull failed', error.message);
        setReady(true);
        return;
      }
      setFavs((prev) => {
        const next = { ...prev };
        for (const row of (data ?? []) as FavoriteRow[]) {
          const key = favKey(row.entity_type, row.entity_uuid);
          const cloudAt = new Date(row.updated_at).getTime();
          // Cloud wins on conflict; keep local-only keys (toggled before
          // the pull finished — they'll be pushed on toggle).
          if (cloudAt >= (localWriteAt.current[key] ?? 0)) {
            next[key] = { isFavorite: row.is_favorite, updatedAt: cloudAt };
            localWriteAt.current[key] = cloudAt;
          }
        }
        try {
          localStorage.setItem(cacheKey(userId), JSON.stringify(next));
        } catch {
          /* storage full — non-fatal */
        }
        return next;
      });
      setReady(true);
    })().catch((e) => {
      if (!cancelled) {
        console.warn('[cloud-sync] favorite pull failed', e);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  const toggleFavorite = useCallback(
    async (type: FavoriteEntityType, uuid?: string | null) => {
      if (!uuid || !userId || !isCloudEnabled || status !== 'authed') return;
      const key = favKey(type, uuid);
      const now = Date.now();
      const nextVal = !(favs[key]?.isFavorite === true);

      // Optimistic update.
      localWriteAt.current[key] = now;
      setFavs((prev) => {
        const next = { ...prev, [key]: { isFavorite: nextVal, updatedAt: now } };
        try {
          localStorage.setItem(cacheKey(userId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      const { error } = await getSupabase()
        .from('favorites')
        .upsert(
          {
            user_id: userId,
            entity_type: type,
            entity_uuid: uuid,
            is_favorite: nextVal,
            updated_at: new Date(now).toISOString(),
          },
          { onConflict: 'user_id,entity_type,entity_uuid' }
        );
      if (error) {
        console.warn('[cloud-sync] favorite push failed, reverting', error.message);
        localWriteAt.current[key] = now;
        setFavs((prev) => ({ ...prev, [key]: { isFavorite: !nextVal, updatedAt: now } }));
      }
    },
    [favs, status, userId]
  );

  const isFavorite = useCallback(
    (type: FavoriteEntityType, uuid?: string | null) => {
      if (!uuid) return false;
      return favs[favKey(type, uuid)]?.isFavorite === true;
    },
    [favs]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ ready, favorites: favs, isFavorite, toggleFavorite }),
    [ready, favs, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
