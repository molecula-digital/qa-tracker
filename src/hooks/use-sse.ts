import { useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

let _clientId: string | null = null;

/** Stable per-tab client ID used for SSE self-exclusion */
export function getSSEClientId(): string {
  if (!_clientId) {
    _clientId = crypto.randomUUID();
  }
  return _clientId;
}

export function useSSE(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const clientId = useMemo(() => getSSEClientId(), []);

  useEffect(() => {
    if (!projectId) return;

    const url = `/api/sse?projectId=${encodeURIComponent(projectId)}&clientId=${encodeURIComponent(clientId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("invalidate", (event) => {
      try {
        const data = JSON.parse(event.data);
        queryClient.invalidateQueries({
          queryKey: [data.entity, projectId],
        });
        // Also invalidate the full board query so nested data refreshes
        queryClient.invalidateQueries({
          queryKey: ["board", projectId],
        });
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.onerror = () => {
      console.log("[SSE] Connection error, reconnecting...");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [projectId, queryClient, clientId]);
}
