import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSSE(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const url = `/api/sse?projectId=${encodeURIComponent(projectId)}`;
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
  }, [projectId, queryClient]);
}
