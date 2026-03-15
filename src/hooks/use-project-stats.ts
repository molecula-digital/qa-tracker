"use client";

import { useQuery } from "@tanstack/react-query";

export interface ProjectStats {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
  itemCount: number;
  doneCount: number;
  recentActivityCount: number;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useProjectStats() {
  return useQuery<ProjectStats[]>({
    queryKey: ["project-stats"],
    queryFn: () => fetchJSON("/api/projects/stats"),
  });
}
