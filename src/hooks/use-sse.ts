import { useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Section, Item } from "@/types/tracker";

let _clientId: string | null = null;

/** Stable per-tab client ID used for SSE self-exclusion */
export function getSSEClientId(): string {
  if (!_clientId) {
    _clientId = crypto.randomUUID();
  }
  return _clientId;
}

type BoardData = { sections: Section[] };

function applyPatch(board: BoardData, patch: Record<string, unknown>): BoardData {
  const action = patch.action as string;

  switch (action) {
    case "section:create": {
      const d = patch.data as { id: string; title: string; open: boolean; color?: string; icon?: string };
      return {
        sections: [
          ...board.sections,
          { id: d.id, title: d.title, open: d.open, color: d.color, icon: d.icon, items: [] },
        ],
      };
    }
    case "section:update": {
      const sectionId = patch.sectionId as string;
      const d = patch.data as Record<string, unknown>;
      return {
        sections: board.sections.map((s) =>
          s.id === sectionId ? { ...s, ...d } : s
        ),
      };
    }
    case "section:delete": {
      const sectionId = patch.sectionId as string;
      return {
        sections: board.sections.filter((s) => s.id !== sectionId),
      };
    }
    case "section:reorder": {
      const sectionIds = patch.sectionIds as string[];
      const byId = new Map(board.sections.map((s) => [s.id, s]));
      const reordered = sectionIds.map((id) => byId.get(id)).filter(Boolean) as Section[];
      // Append any sections not in the reorder list (safety)
      for (const s of board.sections) {
        if (!sectionIds.includes(s.id)) reordered.push(s);
      }
      return { sections: reordered };
    }
    case "item:create": {
      const sectionId = patch.sectionId as string;
      const d = patch.data as { id: string; text: string; checked: boolean; priority: string | null; tags: string[]; notes: never[] };
      return {
        sections: board.sections.map((s) =>
          s.id === sectionId
            ? { ...s, items: [...s.items, { id: d.id, text: d.text, checked: d.checked, priority: (d.priority ?? null) as Item["priority"], createdAt: Date.now(), tags: d.tags as Item["tags"], notes: [] }] }
            : s
        ),
      };
    }
    case "item:update": {
      const sectionId = patch.sectionId as string;
      const itemId = patch.itemId as string;
      const d = patch.data as Record<string, unknown>;
      return {
        sections: board.sections.map((s) =>
          s.id === sectionId
            ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...d } : i)) }
            : s
        ),
      };
    }
    case "item:delete": {
      const sectionId = patch.sectionId as string;
      const itemId = patch.itemId as string;
      return {
        sections: board.sections.map((s) =>
          s.id === sectionId
            ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
            : s
        ),
      };
    }
    case "item:tags": {
      const sectionId = patch.sectionId as string;
      const itemId = patch.itemId as string;
      const tags = patch.tags as Item["tags"];
      return {
        sections: board.sections.map((s) =>
          s.id === sectionId
            ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, tags } : i)) }
            : s
        ),
      };
    }
    case "note:create": {
      const sectionId = patch.sectionId as string;
      const itemId = patch.itemId as string;
      const d = patch.data as { id: string; text: string; ts: number };
      return {
        sections: board.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((i) =>
                  i.id === itemId ? { ...i, notes: [...i.notes, d] } : i
                ),
              }
            : s
        ),
      };
    }
    case "note:delete": {
      const sectionId = patch.sectionId as string;
      const itemId = patch.itemId as string;
      const noteId = patch.noteId as string;
      return {
        sections: board.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((i) =>
                  i.id === itemId ? { ...i, notes: i.notes.filter((n) => n.id !== noteId) } : i
                ),
              }
            : s
        ),
      };
    }
    default:
      return board;
  }
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

    // Patch events: apply mutation directly to board cache (no refetch)
    eventSource.addEventListener("patch", (event) => {
      try {
        const patch = JSON.parse(event.data);
        queryClient.setQueryData<BoardData>(["board", projectId], (old) => {
          if (!old) return old;
          return applyPatch(old, patch);
        });
        // Also invalidate activity since patches don't carry activity data
        queryClient.invalidateQueries({ queryKey: ["activity", projectId] });
      } catch {
        // Fallback: invalidate on parse error
        queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      }
    });

    // Legacy invalidate events (for entities not using patches)
    eventSource.addEventListener("invalidate", (event) => {
      try {
        const data = JSON.parse(event.data);
        queryClient.invalidateQueries({
          queryKey: [data.entity, projectId],
        });
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
