'use client';

import player from '@/lib/player';
import { CloudAuthProvider } from '@/lib/cloud/auth';
import { FavoritesProvider } from '@/lib/cloud/favorites';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { PropsWithChildren, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux';

export default function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
          },
        },
      })
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        player.togglePlayPause();
      }
      if (e.code === 'ArrowRight') {
        player.next();
      }
      if (e.code === 'ArrowLeft') {
        player.previous();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <CloudAuthProvider>
          <FavoritesProvider>
            <NuqsAdapter>
              <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
            </NuqsAdapter>
          </FavoritesProvider>
        </CloudAuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}
