"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Plus, X, CheckCircle2, LayoutGrid, ListTodo,
  Activity, Clock, User, TrendingUp, Copy, ExternalLink, Check,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useProject } from "@/hooks/use-projects";
import { useBoard } from "@/hooks/use-board";
import { useSSE } from "@/hooks/use-sse";
import { useActivity, type Activity as ActivityType } from "@/hooks/use-activity";
import {
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
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
import { ProjectLinks } from "@/components/ProjectLinks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Item, TagKey } from "@/types/tracker";
import { useUpdateProject } from "@/hooks/use-projects";
import { organization as orgClient } from "@/lib/auth-client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ── helpers ── */

const ACTION_COLORS: Record<string, string> = {
  created: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  updated: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  deleted: "bg-red-500/15 text-red-400 border-red-500/25",
  checked: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  unchecked: "bg-amber-500/15 text-amber-400 border-amber-500/25",
};

const ENTITY_LABELS: Record<string, string> = {
  section: "Section",
  item: "Item",
  note: "Note",
  tag: "Tag",
};

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ── ActivityTable ── */

function ActivityTable({ activities, isLoading }: { activities: ActivityType[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">Loading activity...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <EmptyState
          icon={Activity}
          title="No activity yet"
          subtitle="Actions on this project will appear here."
        />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[140px]">Time</TableHead>
            <TableHead className="w-[120px]">User</TableHead>
            <TableHead className="w-[90px]">Action</TableHead>
            <TableHead className="w-[80px]">Entity</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {timeAgo(a.createdAt)}
                </span>
              </TableCell>
              <TableCell className="text-xs">
                <span className="flex items-center gap-1.5">
                  <User size={12} className="text-muted-foreground" />
                  <span className="truncate max-w-[100px]">{a.actorName}</span>
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${ACTION_COLORS[a.action] ?? "bg-muted text-muted-foreground border-border"}`}
                >
                  {a.action}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {ENTITY_LABELS[a.entity] ?? a.entity}
                </span>
              </TableCell>
              <TableCell className="text-xs text-foreground max-w-[300px] truncate">
                {a.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── StatsPanel ── */

function StatsPanel({
  stats,
  progressPct,
}: {
  stats: {
    done: number;
    total: number;
    sections: number;
    perSection: { name: string; done: number; total: number }[];
  };
  progressPct: number;
}) {
  return (
    <div className="space-y-6 p-1">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutGrid size={14} className="text-blue-400" />
            <span className="text-xs uppercase tracking-wide font-medium">Sections</span>
          </div>
          <span className="text-2xl font-mono font-bold">{stats.sections}</span>
        </div>
        <div className="flex flex-col gap-1 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ListTodo size={14} className="text-amber-400" />
            <span className="text-xs uppercase tracking-wide font-medium">Total Items</span>
          </div>
          <span className="text-2xl font-mono font-bold">{stats.total}</span>
        </div>
        <div className="flex flex-col gap-1 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs uppercase tracking-wide font-medium">Completed</span>
          </div>
          <span className="text-2xl font-mono font-bold">{stats.done}</span>
        </div>
        <div className="flex flex-col gap-1 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp size={14} className="text-violet-400" />
            <span className="text-xs uppercase tracking-wide font-medium">Progress</span>
          </div>
          <span className="text-2xl font-mono font-bold">{progressPct}%</span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Overall completion</span>
          <span className="font-mono">{stats.done} of {stats.total} items</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Per-section breakdown */}
      {stats.perSection.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Section breakdown</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Section</TableHead>
                  <TableHead className="w-[100px] text-right">Done</TableHead>
                  <TableHead className="w-[100px] text-right">Total</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.perSection.map((sec) => {
                  const pct = sec.total > 0 ? Math.round((sec.done / sec.total) * 100) : 0;
                  return (
                    <TableRow key={sec.name}>
                      <TableCell className="font-medium text-sm">{sec.name}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-400">
                        {sec.done}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {sec.total}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ProjectSettings ── */

function ProjectSettings({ project }: { project: { id: string; name: string; description: string | null; slug: string; isPublic: boolean } }) {
  const updateProject = useUpdateProject();
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [slug, setSlug] = useState(project.slug);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [copied, setCopied] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  useEffect(() => {
    orgClient.getFullOrganization().then((result) => {
      if (result.data?.slug) setOrgSlug(result.data.slug);
    });
  }, []);

  const publicUrl = orgSlug && typeof window !== "undefined"
    ? `${window.location.origin}/p/${orgSlug}/${slug}`
    : "";

  const handleTogglePublic = (checked: boolean) => {
    setIsPublic(checked);
    updateProject.mutate({ id: project.id, isPublic: checked });
  };

  const handleSaveSlug = () => {
    const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!pattern.test(slug)) {
      setSlugError("Lowercase letters, numbers, and hyphens only");
      return;
    }
    setSlugError("");
    updateProject.mutate(
      { id: project.id, slug },
      {
        onError: (err) => {
          if (err.message.includes("409") || err.message.includes("Slug")) {
            setSlugError("This slug is already in use");
          }
        },
      }
    );
  };

  const handleSaveDetails = () => {
    updateProject.mutate({
      id: project.id,
      name,
      description: description || undefined,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg space-y-8 p-1">
      {/* Public access */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Public access</h3>
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Make this project public</p>
            <p className="text-xs text-muted-foreground">
              Anyone with the link can view the board in read-only mode
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={handleTogglePublic} />
        </div>

        {isPublic && (
          <div className="space-y-3 pl-1">
            {/* Public URL */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
              <ExternalLink size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                {publicUrl || "Save to generate URL"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 shrink-0"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </Button>
            </div>

            {/* Slug editor */}
            <div className="space-y-1.5">
              <Label htmlFor="project-slug" className="text-xs">URL slug</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="project-slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugError(""); }}
                  className="h-8 text-sm font-mono"
                  placeholder="my-project"
                />
                <Button size="sm" className="h-8" onClick={handleSaveSlug}>
                  Save
                </Button>
              </div>
              {slugError && (
                <p className="text-xs text-red-400">{slugError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Project details */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Project details</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="text-xs">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-desc" className="text-xs">Description</Label>
            <Input
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-sm"
              placeholder="Optional description"
            />
          </div>
          <Button size="sm" onClick={handleSaveDetails}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const { data: activities = [], isLoading: loadingActivity } = useActivity(id);
  useSSE(id);

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [newestSectionId, setNewestSectionId] = useState<string | null>(null);

  const [tagPickerState, setTagPickerState] = useState<{
    item: Item;
    sectionId: string;
    anchorEl: HTMLButtonElement;
  } | null>(null);

  // Mutations
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const setItemTags = useSetItemTags();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const invalidateBoard = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["board", id] });
    qc.invalidateQueries({ queryKey: ["activity", id] });
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

      reorderSections.mutate(
        { projectId: id, sectionIds: reordered.map((s) => s.id) },
        { onSettled: invalidateBoard }
      );
    },
    [board, reorderSections, id, invalidateBoard]
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
        <p className="text-muted-foreground text-sm">Loading project...</p>
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
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {project.name}
        </span>

        {/* Project links */}
        <ProjectLinks projectId={id} />

        {/* Stats pill */}
        {stats.total > 0 && (
          <div className="flex items-center gap-2 ml-2 px-2.5 py-1 rounded-md bg-muted border border-border">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="text-xs text-foreground font-mono">
              {stats.done}/{stats.total}
            </span>
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{progressPct}%</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search toggle */}
        {searchOpen ? (
          <div className="flex items-center gap-1.5 bg-muted border border-border rounded-md px-2 h-7">
            <Search size={12} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-32 text-xs bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={() => { setSearch(""); setSearchOpen(false); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Search (Ctrl+F)"
          >
            <Search size={14} />
          </button>
        )}

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

      {/* Tabs: Board + Activity + Stats */}
      <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="shrink-0 self-start bg-muted mb-2">
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="flex-1 overflow-hidden mt-0 -mx-4">
          {loadingBoard ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">Loading board...</p>
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
                onAddSection={handleAddSection}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="flex-1 overflow-auto mt-0">
          <ActivityTable activities={activities} isLoading={loadingActivity} />
        </TabsContent>

        <TabsContent value="stats" className="flex-1 overflow-auto mt-0">
          {loadingBoard ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">Loading stats...</p>
            </div>
          ) : (
            <StatsPanel stats={stats} progressPct={progressPct} />
          )}
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-auto mt-0">
          {project && (
            <ProjectSettings project={project as { id: string; name: string; description: string | null; slug: string; isPublic: boolean }} />
          )}
        </TabsContent>
      </Tabs>

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
