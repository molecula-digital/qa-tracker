"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(url, init);
}

interface Item {
  id: string;
  sectionId: string;
  text: string;
  checked: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export function useItems(sectionId: string) {
  return useQuery<Item[]>({
    queryKey: ["items", sectionId],
    queryFn: () =>
      fetchJSON(`/api/items?sectionId=${encodeURIComponent(sectionId)}`),
    enabled: !!sectionId,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sectionId: string;
      text: string;
      order?: number;
      priority?: "low" | "medium" | "high" | "urgent";
      tags?: ("bug" | "question" | "later")[];
    }) =>
      fetchJSON<Item>("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["items", vars.sectionId] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      currentSectionId: string;
      text?: string;
      checked?: boolean;
      order?: number;
      sectionId?: string; // target section for moves
      priority?: "low" | "medium" | "high" | "urgent" | null;
    }) => {
      const { id, currentSectionId: _, ...data } = vars;
      return fetchJSON<Item>(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["items", vars.currentSectionId] });
      if (vars.sectionId && vars.sectionId !== vars.currentSectionId) {
        qc.invalidateQueries({ queryKey: ["items", vars.sectionId] });
      }
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sectionId }: { id: string; sectionId: string }) =>
      fetchJSON(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["items", vars.sectionId] });
    },
  });
}

export function useSetItemTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      sectionId,
      tags,
    }: {
      id: string;
      sectionId: string;
      tags: ("bug" | "question" | "later")[];
    }) =>
      fetchJSON(`/api/items/${id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["items", vars.sectionId] });
    },
  });
}
