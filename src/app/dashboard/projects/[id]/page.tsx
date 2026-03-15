"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
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
  const [newestSectionId, setNewestSectionId] = useState<string | null>(null);

  // Tag picker state
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

  // Helper to find an item from the board data
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

      // Update order for each affected section
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

      // Update the picker state with new tags so the UI reflects the change
      setTagPickerState((prev) =>
        prev ? { ...prev, item: { ...prev.item, tags: newTags } } : null
      );
    },
    [tagPickerState, setItemTags, invalidateBoard]
  );

  if (loadingProject) {
    return <p className="text-neutral-500 text-sm">Loading project...</p>;
  }

  if (projectError) {
    return (
      <p className="text-red-600 text-sm">
        Failed to load project: {projectError.message}
      </p>
    );
  }

  if (!project) {
    return <p className="text-neutral-500 text-sm">Project not found.</p>;
  }

  const sections = board?.sections ?? [];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          &larr; Back to projects
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">
          {project.name}
        </h1>
        {project.description && (
          <p className="text-sm text-neutral-500 mt-1">
            {project.description}
          </p>
        )}
      </div>

      {/* Toolbar: search + add section */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg">
          <Search size={14} className="text-neutral-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        <button
          onClick={handleAddSection}
          disabled={createSection.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-800 disabled:opacity-50"
        >
          <Plus size={14} /> Add section
        </button>
      </div>

      {/* Board */}
      {loadingBoard ? (
        <p className="text-neutral-500 text-sm">Loading board...</p>
      ) : (
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
      )}

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
