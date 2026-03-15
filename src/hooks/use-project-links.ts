"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  icon: string;
  order: number;
  createdBy: string;
  createdAt: string;
}

export function useProjectLinks(projectId: string) {
  return useQuery<ProjectLink[]>({
    queryKey: ["project-links", projectId],
    queryFn: () =>
      fetchJSON(`/api/project-links?projectId=${encodeURIComponent(projectId)}`),
    enabled: !!projectId,
  });
}

export function useCreateProjectLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      title: string;
      url: string;
      icon?: string;
    }) =>
      fetchJSON<ProjectLink>("/api/project-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-links", vars.projectId] });
    },
  });
}

export function useUpdateProjectLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      projectId,
      ...data
    }: {
      id: string;
      projectId: string;
      title?: string;
      url?: string;
      icon?: string;
    }) =>
      fetchJSON<ProjectLink>(`/api/project-links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-links", vars.projectId] });
    },
  });
}

export function useDeleteProjectLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      fetchJSON(`/api/project-links/${id}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-links", vars.projectId] });
    },
  });
}
