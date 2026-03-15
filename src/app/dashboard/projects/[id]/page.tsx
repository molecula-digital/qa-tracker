"use client";

import { use, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, X, BarChart3, CheckCircle2, LayoutGrid, ListTodo } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useProject } from "@/hooks/use-projects";
import { useBoard } from "@/hooks/use-board";
import { useSSE } from "@/hooks/use-sse";
import {
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
} from "@/hooks/use-sections";
import {
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useSetItemTags,
} from "@/hooks/use-items";
import { useCreateNote, useDeleteNote } from "@/hooks/use-notes";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TagPicker } from "@/components/TagPicker";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Item, TagKey } from "@/types/tracker";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const {
    data: project,
    isLoading: loadingProject,
    error: projectError,
  } = useProject(id);
  const { data: board, isLoading: loadingBoard } = useBoard(id);
  useSSE(id);

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [newestSectionId, setNewestSectionId] = useState<string | null>(null);

  const [statsOpen, setStatsOpen] = useState(false);

  const [tagPickerState, setTagPickerState] = useState<{
    item: Item;
    sectionId: string;
    anchorEl: HTMLButtonElement;
  } | null>(null);

  // Mutations
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const setItemTags = useSetItemTags();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const invalidateBoard = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["board", id] });
  }, [qc, id]);

  // Stats
  const stats = useMemo(() => {
    if (!board?.sections) return { done: 0, total: 0, sections: 0, perSection: [] as { name: string; done: number; total: number }[] };
    let done = 0;
    let total = 0;
    const perSection: { name: string; done: number; total: number }[] = [];
    for (const sec of board.sections) {
      let secDone = 0;
      let secTotal = 0;
      for (const item of sec.items) {
        total++;
        secTotal++;
        if (item.checked) { done++; secDone++; }
      }
      perSection.push({ name: sec.title, done: secDone, total: secTotal });
    }
    return { done, total, sections: board.sections.length, perSection };
  }, [board]);

  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const findItem = useCallback(
    (sectionId: string, itemId: string) => {
      const sec = board?.sections.find((s) => s.id === sectionId);
      return sec?.items.find((i) => i.id === itemId);
    },
    [board]
  );

  // Callbacks
  const handleToggleItem = useCallback(
    (sectionId: string, itemId: string) => {
      const item = findItem(sectionId, itemId);
      if (!item) return;
      updateItem.mutate(
        { id: itemId, currentSectionId: sectionId, checked: !item.checked },
        { onSettled: invalidateBoard }
      );
    },
    [findItem, updateItem, invalidateBoard]
  );

  const handleAddItem = useCallback(
    (sectionId: string, text: string) => {
      createItem.mutate(
        { sectionId, text },
        { onSettled: invalidateBoard }
      );
    },
    [createItem, invalidateBoard]
  );

  const handleDeleteItem = useCallback(
    (sectionId: string, itemId: string) => {
      deleteItem.mutate(
        { id: itemId, sectionId },
        { onSettled: invalidateBoard }
      );
    },
    [deleteItem, invalidateBoard]
  );

  const handleAddNote = useCallback(
    (_sectionId: string, itemId: string, text: string) => {
      createNote.mutate(
        { itemId, text },
        { onSettled: invalidateBoard }
      );
    },
    [createNote, invalidateBoard]
  );

  const handleDeleteNote = useCallback(
    (_sectionId: string, itemId: string, noteId: string) => {
      deleteNote.mutate(
        { id: noteId, itemId },
        { onSettled: invalidateBoard }
      );
    },
    [deleteNote, invalidateBoard]
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      deleteSection.mutate(
        { id: sectionId, projectId: id },
        { onSettled: invalidateBoard }
      );
    },
    [deleteSection, id, invalidateBoard]
  );

  const handleUpdateSectionTitle = useCallback(
    (sectionId: string, title: string) => {
      updateSection.mutate(
        { id: sectionId, projectId: id, title },
        { onSettled: invalidateBoard }
      );
    },
    [updateSection, id, invalidateBoard]
  );

  const handleColorChange = useCallback(
    (sectionId: string, color: string) => {
      updateSection.mutate(
        { id: sectionId, projectId: id, color },
        { onSettled: invalidateBoard }
      );
    },
    [updateSection, id, invalidateBoard]
  );

  const handleIconChange = useCallback(
    (sectionId: string, icon: string) => {
      updateSection.mutate(
        { id: sectionId, projectId: id, icon },
        { onSettled: invalidateBoard }
      );
    },
    [updateSection, id, invalidateBoard]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!board?.sections) return;
      const reordered = [...board.sections];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      reordered.forEach((sec, idx) => {
        updateSection.mutate(
          { id: sec.id, projectId: id, order: idx },
          { onSettled: invalidateBoard }
        );
      });
    },
    [board, updateSection, id, invalidateBoard]
  );

  const handleAddSection = useCallback(() => {
    createSection.mutate(
      { projectId: id, title: "New section" },
      {
        onSuccess: (data) => {
          setNewestSectionId(data.id);
          setTimeout(() => setNewestSectionId(null), 2000);
        },
        onSettled: invalidateBoard,
      }
    );
  }, [createSection, id, invalidateBoard]);

  const handleOpenTagPicker = useCallback(
    (anchorEl: HTMLButtonElement, item: Item, sectionId: string) => {
      setTagPickerState({ item, sectionId, anchorEl });
    },
    []
  );

  const handleToggleTag = useCallback(
    (tag: TagKey) => {
      if (!tagPickerState) return;
      const { item, sectionId } = tagPickerState;
      const currentTags = item.tags;
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];

      setItemTags.mutate(
        { id: item.id, sectionId, tags: newTags },
        { onSettled: invalidateBoard }
      );

      setTagPickerState((prev) =>
        prev ? { ...prev, item: { ...prev.item, tags: newTags } } : null
      );
    },
    [tagPickerState, setItemTags, invalidateBoard]
  );

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500 text-sm">Loading project...</p>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400 text-sm">
          {projectError ? `Failed to load: ${projectError.message}` : "Project not found."}
        </p>
      </div>
    );
  }

  const sections = board?.sections ?? [];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Compact header */}
      <div className="flex items-center gap-2 mb-3 shrink-0 min-h-[36px]">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Projects
        </Link>
        <span className="text-neutral-700 text-xs">/</span>
        <span className="text-sm font-medium text-neutral-200 truncate max-w-[200px]">
          {project.name}
        </span>

        {/* Stats pill */}
        {stats.total > 0 && (
          <div className="flex items-center gap-2 ml-2 px-2.5 py-1 rounded-md bg-neutral-800/60 border border-neutral-700/50">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="text-xs text-neutral-300 font-mono">
              {stats.done}/{stats.total}
            </span>
            <div className="w-16 h-1.5 rounded-full bg-neutral-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">{progressPct}%</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search toggle */}
        {searchOpen ? (
          <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-md px-2 h-7">
            <Search size={12} className="text-neutral-500 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-32 text-xs bg-transparent text-neutral-200 placeholder:text-neutral-600 outline-none"
            />
            <button
              onClick={() => { setSearch(""); setSearchOpen(false); }}
              className="text-neutral-500 hover:text-neutral-300"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
            title="Search (Ctrl+F)"
          >
            <Search size={14} />
          </button>
        )}

        {/* Stats button */}
        <button
          onClick={() => setStatsOpen(true)}
          className="flex items-center justify-center w-7 h-7 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          title={`${stats.sections} sections, ${stats.total} items, ${stats.done} done`}
        >
          <BarChart3 size={14} />
        </button>

        {/* Add section */}
        <Button
          onClick={handleAddSection}
          disabled={createSection.isPending}
          size="sm"
          className="h-7 text-xs gap-1 px-2.5"
        >
          <Plus size={12} /> Section
        </Button>
      </div>

      {/* Tabs: Board + Activity */}
      <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="shrink-0 self-start bg-neutral-800 mb-2">
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="flex-1 overflow-hidden mt-0 -mx-4">
          {loadingBoard ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500 text-sm">Loading board...</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={LayoutGrid}
                title="No sections yet"
                subtitle="Add your first section to start organizing test cases."
                ctaLabel="Add section"
                onCta={handleAddSection}
              />
            </div>
          ) : (
            <div className="h-full px-4">
              <KanbanBoard
                sections={sections}
                search={search}
                newestSectionId={newestSectionId}
                onToggleItem={handleToggleItem}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                onDeleteSection={handleDeleteSection}
                onUpdateSectionTitle={handleUpdateSectionTitle}
                onColorChange={handleColorChange}
                onIconChange={handleIconChange}
                onReorder={handleReorder}
                onOpenTagPicker={handleOpenTagPicker}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="flex-1 overflow-auto mt-0">
          <div className="text-sm text-neutral-500 py-8 text-center">
            Activity feed coming soon.
          </div>
        </TabsContent>
      </Tabs>

      {/* Stats dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Project Statistics</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/50">
                <LayoutGrid size={16} className="text-blue-400" />
                <span className="text-lg font-mono font-bold">{stats.sections}</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Sections</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/50">
                <ListTodo size={16} className="text-amber-400" />
                <span className="text-lg font-mono font-bold">{stats.total}</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Items</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/50">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-lg font-mono font-bold">{stats.done}</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Done</span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-2 rounded-full bg-neutral-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm font-mono text-neutral-400">{progressPct}%</span>
            </div>

            {stats.perSection && stats.perSection.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Per section</p>
                {stats.perSection.map((sec) => {
                  const pct = sec.total > 0 ? Math.round((sec.done / sec.total) * 100) : 0;
                  return (
                    <div key={sec.name} className="flex items-center gap-3">
                      <span className="text-xs text-neutral-300 truncate w-28">{sec.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500 w-12 text-right">
                        {sec.done}/{sec.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag picker popup */}
      {tagPickerState && (
        <TagPicker
          item={tagPickerState.item}
          anchorEl={tagPickerState.anchorEl}
          onToggleTag={handleToggleTag}
          onClose={() => setTagPickerState(null)}
        />
      )}
    </div>
  );
}
