// Band overview (/phish) uses the new Spotify-style page; this old column is nulled.
// Deeper routes (/:artistSlug/:year/...) still use @years/[...artistSlug]/page.tsx.
export default function NullSlot() {
  return null;
}
