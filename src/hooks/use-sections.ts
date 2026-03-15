"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(url, init);
}

interface Section {
  id: string;
  projectId: string;
  title: string;
  order: number;
  color: string | null;
  icon: string | null;
  open: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useSections(projectId: string) {
  return useQuery<Section[]>({
    queryKey: ["sections", projectId],
    queryFn: () =>
      fetchJSON(`/api/sections?projectId=${encodeURIComponent(projectId)}`),
    enabled: !!projectId,
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      title: string;
      order?: number;
      color?: string;
      icon?: string;
    }) =>
      fetchJSON<Section>("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sections", vars.projectId] });
    },
  });
}

export function useUpdateSection() {
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
      order?: number;
      color?: string | null;
      icon?: string | null;
      open?: boolean;
    }) =>
      fetchJSON<Section>(`/api/sections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sections", vars.projectId] });
    },
  });
}

export function useReorderSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; sectionIds: string[] }) =>
      fetchJSON<{ success: boolean }>("/api/sections/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sections", vars.projectId] });
    },
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      fetchJSON(`/api/sections/${id}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sections", vars.projectId] });
    },
  });
}
