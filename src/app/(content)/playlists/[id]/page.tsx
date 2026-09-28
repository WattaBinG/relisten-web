import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PlaylistDetail from './PlaylistDetail';

interface PlaylistMeta {
  name: string;
  description: string | null;
  ownerUsername: string | null;
  trackCount: number;
}

/**
 * Server-side metadata fetch for link previews. Only public playlists get
 * share metadata — private playlist names never leak to crawlers.
 */
async function getPlaylistMeta(id: string): Promise<PlaylistMeta | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key);
  const { data: pl } = await sb
    .from('playlists')
    .select('name,description,user_id,is_public')
    .eq('id', id)
    .maybeSingle();
  if (!pl || !pl.is_public) return null;
  const [{ count }, { data: owner }] = await Promise.all([
    sb.from('playlist_tracks').select('id', { count: 'exact', head: true }).eq('playlist_id', id),
    sb.from('profiles').select('username').eq('id', pl.user_id).maybeSingle(),
  ]);
  return {
    name: pl.name as string,
    description: (pl.description as string | null) ?? null,
    ownerUsername: (owner?.username as string | undefined) ?? null,
    trackCount: count ?? 0,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = await getPlaylistMeta(id);
  if (!meta) return { title: 'Playlist not found' };
  const byline = meta.ownerUsername ? ` by @${meta.ownerUsername}` : '';
  const description =
    meta.description?.trim() || `${meta.trackCount} tracks${byline} \u2014 listen on The Lot`;
  const title = `${meta.name} \u2014 playlist`;
  const ogImage = `/api/og/playlist?id=${encodeURIComponent(id)}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: meta.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaylistDetail id={id} />;
}
