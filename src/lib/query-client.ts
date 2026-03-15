import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | null = null;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30 * 1000 },
      },
    });
  }
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30 * 1000 },
      },
    });
  }
  return queryClient;
}
