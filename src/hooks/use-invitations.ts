import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PendingInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string | null;
  expiresAt: string;
  createdAt: string;
}

export function usePendingInvitations() {
  return useQuery<PendingInvitation[]>({
    queryKey: ["pending-invitations"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding/invitations");
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch("/api/onboarding/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      // Full page reload to refresh session with new active org
      window.location.href = "/dashboard";
    },
  });
}
