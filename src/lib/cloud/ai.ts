import { getSupabase, isCloudEnabled } from './supabase';

/**
 * Client for the `ai-concierge` Supabase Edge Function.
 *
 * The OpenAI key lives ONLY in the edge function secret — it is never in the
 * app. All calls require a signed-in user (the function's verify_jwt plus our
 * own session check), and the function enforces 10 AI calls/day per user.
 */

const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-concierge`;

export interface AiTokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface AiError {
  code: string;
  message: string;
}

export type AiResult<T> =
  | { ok: true; result: T; tokenUsage: AiTokenUsage; remaining: number }
  | { ok: false; error: AiError };

async function callAiConcierge<T>(body: Record<string, unknown>): Promise<AiResult<T>> {
  if (!isCloudEnabled || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, error: { code: 'unavailable', message: 'Cloud sync is not enabled.' } };
  }
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: { code: 'login_required', message: 'Sign in to use AI features.' } };
  }

  let res: Response;
  try {
    res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: { code: 'network', message: 'Could not reach the AI service.' } };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: data.error || 'ai_error',
        message: data.message || 'The AI request failed — try again.',
      },
    };
  }
  return {
    ok: true,
    result: data.result as T,
    tokenUsage: data.tokenUsage ?? { prompt_tokens: 0, completion_tokens: 0 },
    remaining: data.remaining ?? -1,
  };
}

export interface ShowStoryInput {
  artistName: string;
  date: string; // YYYY-MM-DD
  venue?: string | null;
  setlist: string[];
  reviews: string[];
}

export function requestShowStory(input: ShowStoryInput): Promise<AiResult<string>> {
  return callAiConcierge<string>({ mode: 'show-story', ...input });
}

export interface AiPlaylistTrack {
  artist: string;
  song: string;
  showDate: string | null;
}

export interface AiPlaylist {
  name: string;
  tracks: AiPlaylistTrack[];
}

export function requestAiPlaylist(prompt: string): Promise<AiResult<AiPlaylist>> {
  return callAiConcierge<AiPlaylist>({ mode: 'playlist', prompt });
}
