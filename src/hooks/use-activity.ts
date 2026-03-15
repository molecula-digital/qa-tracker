"use client";

import { useQuery } from "@tanstack/react-query";

export interface Activity {
  id: string;
  projectId: string;
  actorId: string;
  actorName: string;
  action: "created" | "updated" | "deleted" | "checked" | "unchecked";
  entity: "section" | "item" | "note" | "tag";
  entityId: string;
  description: string;
  createdAt: string;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useActivity(projectId: string) {
  return useQuery<Activity[]>({
    queryKey: ["activity", projectId],
    queryFn: () =>
      fetchJSON(`/api/activity?projectId=${encodeURIComponent(projectId)}`),
    enabled: !!projectId,
    refetchInterval: 30_000,
  });
}
