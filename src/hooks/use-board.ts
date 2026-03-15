"use client";

import { useQuery } from "@tanstack/react-query";
import type { Section } from "@/types/tracker";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useBoard(projectId: string) {
  return useQuery<{ sections: Section[] }>({
    queryKey: ["board", projectId],
    queryFn: () =>
      fetchJSON(`/api/board?projectId=${encodeURIComponent(projectId)}`),
    enabled: !!projectId,
    staleTime: 5000,
  });
}
