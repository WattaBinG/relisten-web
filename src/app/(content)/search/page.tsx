import SearchClient from '@/components/search/SearchClient';

export const metadata = {
  title: 'Search',
};

/** Universal search: artists, songs, shows, venues. */
export default function SearchPage() {
  return <SearchClient />;
}
