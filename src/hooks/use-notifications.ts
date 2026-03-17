"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export interface Notification {
  id: string;
  userId: string;
  projectId: string;
  itemId: string | null;
  type: "assigned" | "item_updated" | "item_checked" | "note_added";
  title: string;
  body: string;
  read: boolean;
  emailSent: boolean;
  createdAt: string;
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notification[]>("/api/notifications"),
    refetchInterval: 30000, // poll every 30s as fallback
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notifications-unread"],
    queryFn: () => apiFetch<{ count: number }>("/api/notifications/unread-count"),
    refetchInterval: 15000, // poll more frequently for badge
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch("/api/notifications/read-all", { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}
