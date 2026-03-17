"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
}

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: () => apiFetch<Member[]>("/api/members"),
  });
}
