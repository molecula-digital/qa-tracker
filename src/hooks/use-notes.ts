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

interface Note {
  id: string;
  itemId: string;
  text: string;
  createdBy: string;
  createdAt: string;
}

export function useNotes(itemId: string) {
  return useQuery<Note[]>({
    queryKey: ["notes", itemId],
    queryFn: () =>
      fetchJSON(`/api/notes?itemId=${encodeURIComponent(itemId)}`),
    enabled: !!itemId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; text: string }) =>
      fetchJSON<Note>("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["notes", vars.itemId] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      fetchJSON(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["notes", vars.itemId] });
    },
  });
}
