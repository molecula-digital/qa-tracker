"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/KanbanBoard";
import { EmptyState } from "@/components/EmptyState";
import { LayoutGrid } from "lucide-react";
import type { TagKey } from "@/types/tracker";

interface PublicSection {
  title: string;
  color?: string;
  icon?: string;
  items: {
    text: string;
    checked: boolean;
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
      tags: item.tags as TagKey[],
      notes: [] as { id: string; text: string; ts: number }[],
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

  useEffect(() => {
    if (data?.project.name) {
      document.title = `${data.project.name} — Retrack`;
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
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

  const sections = adaptSections(data.sections);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {data.project.name}
        </h1>
        {data.project.description && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            {data.project.description}
          </p>
        )}
      </div>

      {/* Board */}
      {sections.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <EmptyState
            icon={LayoutGrid}
            title="No sections yet"
            subtitle="This project has no content to display."
          />
        </div>
      ) : (
        <div className="h-[calc(100vh-12rem)]">
          <KanbanBoard
            sections={sections}
            search=""
            newestSectionId={null}
            readOnly
            onToggleItem={() => {}}
            onAddItem={() => {}}
            onDeleteItem={() => {}}
            onAddNote={() => {}}
            onDeleteNote={() => {}}
            onDeleteSection={() => {}}
            onUpdateSectionTitle={() => {}}
            onColorChange={() => {}}
            onIconChange={() => {}}
            onReorder={() => {}}
            onOpenTagPicker={() => {}}
          />
        </div>
      )}
    </div>
  );
}
