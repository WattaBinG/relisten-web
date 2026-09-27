import type { CommunityProfile } from '@/lib/cloud/community';

/** Small circular avatar with initials fallback. */
export default function Avatar({
  profile,
  size = 32,
}: {
  profile: CommunityProfile | null;
  size?: number;
}) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.4) };
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200"
      style={style}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
      ) : (
        <span className="font-bold text-gray-500">
          {(profile?.username ?? '?').slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
