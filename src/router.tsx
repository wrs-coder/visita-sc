import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Offline-first: dados ficam considerados frescos por 12h.
        // Combinado com o persister (PersistQueryClientProvider), as telas
        // abrem instantaneamente a partir do IndexedDB sem nova requisição.
        staleTime: 12 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Onda 1 — prefetch automático ao passar o mouse / focar um link.
    // Abre rotas internas instantaneamente sem custo extra de banco
    // (loader reaproveita o cache do React Query, staleTime de 12h).
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

  return router;
};
