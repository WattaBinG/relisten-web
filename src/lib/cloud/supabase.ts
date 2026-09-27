import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * True when the two public Supabase env vars are set. The user adds these in
 * the Vercel dashboard (they are never committed): NEXT_PUBLIC_SUPABASE_URL
 * and NEXT_PUBLIC_SUPABASE_ANON_KEY. When false, the app behaves exactly like
 * stock Relisten — no auth UI, no cloud sync.
 */
export const isCloudEnabled =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** Browser Supabase client singleton. Session persistence is automatic. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
  }
  return client;
}

export type FavoriteEntityType =
  | 'artist'
  | 'show'
  | 'source'
  | 'source_track'
  | 'song'
  | 'venue'
  | 'tour'
  | 'year';

export interface ProfileRow {
  id: string;
  username: string;
  /** Public HTTPS URL of the avatar image (null until the user uploads one). */
  avatar_url: string | null;
  created_at: string;
}

export interface FavoriteRow {
  user_id: string;
  entity_type: FavoriteEntityType;
  entity_uuid: string;
  is_favorite: boolean;
  updated_at: string;
}
