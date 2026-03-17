"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ListView } from "@/components/ListView";
import { KanbanSkeleton, ListSkeleton } from "@/components/BoardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { LayoutGrid, List } from "lucide-react";
import type { TagKey, PriorityKey } from "@/types/tracker";

interface PublicSection {
  title: string;
  color?: string;
  icon?: string;
  items: {
    text: string;
    checked: boolean;
    priority?: PriorityKey | null;
    tags: string[];
  }[];
}

interface PublicBoardData {
  project: {
    name: string;
    description: string | null;
    slug: string;
  };
  sections: PublicSection[];
}

function usePublicBoard(orgSlug: string, projectSlug: string) {
  return useQuery<PublicBoardData>({
    queryKey: ["public-board", orgSlug, projectSlug],
    queryFn: async () => {
      const res = await fetch(
        `/api/public/board/${encodeURIComponent(orgSlug)}/${encodeURIComponent(projectSlug)}`
      );
      if (!res.ok) throw new Error("Project not found");
      return res.json();
    },
  });
}

// Adapt public data shape to what KanbanBoard expects (add stable IDs)
function adaptSections(sections: PublicSection[]) {
  return sections.map((s, si) => ({
    id: `s-${si}`,
    title: s.title,
    open: true,
    color: s.color,
    icon: s.icon,
    items: s.items.map((item, ii) => ({
      id: `s-${si}-i-${ii}`,
      text: item.text,
      checked: item.checked,
      priority: item.priority ?? null,
      tags: item.tags as TagKey[],
      notes: [] as { id: string; text: string; ts: number }[],
      assignees: [],
    })),
  }));
}

export default function PublicProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = use(params);
  const { data, isLoading, error } = usePublicBoard(orgSlug, projectSlug);

  const [layout, setLayout] = useState<'kanban' | 'list'>(() => {
    if (typeof document === 'undefined') return 'kanban'
    const match = document.cookie.match(/(?:^|; )view-layout=(\w+)/)
    return (match?.[1] === 'list') ? 'list' : 'kanban'
  })

  const handleSetLayout = useCallback((l: 'kanban' | 'list') => {
    setLayout(l)
    document.cookie = `view-layout=${l}; path=/; max-age=31536000; SameSite=Lax`
  }, [])

  useEffect(() => {
    if (data?.project.name) {
      document.title = `${data.project.name} — Retrack`;
    }
  }, [data]);

  if (!isLoading && (error || !data)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">
            This project doesn&apos;t exist or isn&apos;t public.
          </p>
        </div>
      </div>
    );
  }

  const sections = isLoading || !data ? [] : adaptSections(data.sections);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{data?.project.name}</h1>
          {data?.project.description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{data.project.description}</p>
          )}
        </div>
        <div className="ml-auto flex items-center bg-muted border border-border rounded-md">
          <button onClick={() => handleSetLayout('kanban')}
            className={`flex items-center justify-center w-7 h-7 rounded-l-md transition-colors ${
              layout === 'kanban' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`} title="Board view">
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => handleSetLayout('list')}
            className={`flex items-center justify-center w-7 h-7 rounded-r-md transition-colors ${
              layout === 'list' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`} title="List view">
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="h-[calc(100vh-12rem)]">
          {layout === 'kanban' ? <KanbanSkeleton /> : <ListSkeleton />}
        </div>
      ) : sections.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <EmptyState
            icon={LayoutGrid}
            title="No sections yet"
            subtitle="This project has no content to display."
          />
        </div>
      ) : (
        <div className="h-[calc(100vh-12rem)]">
          {layout === 'kanban' ? (
            <KanbanBoard
              sections={sections}
              search=""
              newestSectionId={null}
              readOnly
              onToggleItem={() => {}}
              onAddItem={() => {}}
              onUpdateItemText={() => {}}
              onUpdateItemPriority={() => {}}
              onDeleteItem={() => {}}
              onAddNote={() => {}}
              onDeleteNote={() => {}}
              onDeleteSection={() => {}}
              onUpdateSectionTitle={() => {}}
              onColorChange={() => {}}
              onIconChange={() => {}}
              onReorder={() => {}}
              onOpenTagPicker={() => {}}
              onOpenAssigneePicker={() => {}}
            />
          ) : (
            <ListView
              sections={sections}
              search=""
              newestSectionId={null}
              readOnly
              onToggleItem={() => {}}
              onAddItem={() => {}}
              onUpdateItemText={() => {}}
              onUpdateItemPriority={() => {}}
              onDeleteItem={() => {}}
              onAddNote={() => {}}
              onDeleteNote={() => {}}
              onDeleteSection={() => {}}
              onUpdateSectionTitle={() => {}}
              onColorChange={() => {}}
              onIconChange={() => {}}
              onReorder={() => {}}
              onOpenTagPicker={() => {}}
              onOpenAssigneePicker={() => {}}
            />
          )}
        </div>
      )}
    </div>
  );
}
