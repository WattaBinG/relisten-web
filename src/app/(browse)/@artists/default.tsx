import ArtistsColumn from '@/components/ArtistsColumn';
import { getIsInIframe } from '@/lib/isInIframe';
import { getPathname } from '@/lib/getPathname';

export default async function ArtistsSlot() {
  if (await getIsInIframe()) {
    return null;
  }

  // The homepage (/) has its own full-width layout now; the band column
  // only belongs on band pages.
  if ((await getPathname()) === '/') {
    return null;
  }

  return <ArtistsColumn />;
}
