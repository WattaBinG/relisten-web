import { useCallback, useEffect, useState } from 'react';
import { useCloudAuth } from './auth';
import { getSupabase, isCloudEnabled, type FavoriteRow } from './supabase';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface MonthDay {
  month: number; // 1-12
  day: number; // 1-31
}

/** Parse a YYYY-MM-DD birthday into its month/day. Returns null for junk. */
export function getMonthDay(birthday: string | null | undefined): MonthDay | null {
  if (!birthday) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday.trim());
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

/** "1990-01-26" -> "January 26". Returns null for junk. */
export function formatBirthdayMonthDay(birthday: string | null | undefined): string | null {
  const md = getMonthDay(birthday);
  if (!md) return null;
  return `${MONTH_NAMES[md.month - 1]} ${md.day}`;
}

export interface BirthdayProfile {
  id: string;
  birthday: string | null | undefined;
  birthday_public: boolean | undefined;
}

/**
 * Birthday visibility rule (mirrors the RLS intent documented in migration 008):
 * the birthday is visible to the profile owner, or to anyone when the user
 * opted into showing it publicly. PostgreSQL RLS is row-granular and cannot
 * hide individual columns, so every UI read goes through this.
 */
export function canSeeBirthday(
  viewerId: string | null | undefined,
  profile: BirthdayProfile | null | undefined
): boolean {
  if (!profile?.birthday) return false;
  if (viewerId && viewerId === profile.id) return true;
  return profile.birthday_public === true;
}

/** The visible "January 26" string for a profile, or null when hidden. */
export function visibleBirthday(
  viewerId: string | null | undefined,
  profile: BirthdayProfile | null | undefined
): string | null {
  if (!canSeeBirthday(viewerId, profile)) return null;
  return formatBirthdayMonthDay(profile?.birthday);
}

export interface BirthdayUpdate {
  birthday: string | null; // YYYY-MM-DD or null to clear
  birthday_public: boolean;
  birthday_email_opt_in: boolean;
}

/** Save the signed-in user's birthday settings. Returns an error string, if any. */
export async function updateBirthdaySettings(update: BirthdayUpdate): Promise<string | undefined> {
  if (!isCloudEnabled) return 'Accounts are not configured on this deployment.';
  const sb = getSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return 'You are not signed in.';
  if (update.birthday && !getMonthDay(update.birthday)) {
    return 'That date does not look valid.';
  }
  const { error } = await sb
    .from('profiles')
    .update({
      birthday: update.birthday,
      birthday_public: update.birthday_public,
      birthday_email_opt_in: update.birthday_email_opt_in,
    })
    .eq('id', user.id);
  if (error) return error.message;
  return undefined;
}

/** UUIDs of the signed-in user's favorited artists (for the birthday tape). */
export function useFavoriteArtistUuids(): { uuids: string[]; loading: boolean } {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [uuids, setUuids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId || !isCloudEnabled) {
      setUuids([]);
      setLoading(false);
      return;
    }
    const { data } = await getSupabase()
      .from('favorites')
      .select('entity_uuid')
      .eq('user_id', userId)
      .eq('entity_type', 'artist')
      .eq('is_favorite', true);
    setUuids(((data ?? []) as Pick<FavoriteRow, 'entity_uuid'>[]).map((r) => r.entity_uuid));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { uuids, loading };
}
