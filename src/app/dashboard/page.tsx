"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderKanban, Plus, Trash2, CheckCircle2, ListTodo,
  TrendingUp, LayoutGrid, Activity, Clock, Mail, Building2,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useProjectStats, type ProjectStats } from "@/hooks/use-project-stats";
import { useCreateProject, useDeleteProject } from "@/hooks/use-projects";
import { usePendingInvitations, useAcceptInvitation } from "@/hooks/use-invitations";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ── helpers ── */

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
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ── animation variants ── */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

/* ── PendingInvitationsBanner ── */

function PendingInvitationsBanner() {
  const { data: invitations, isLoading } = usePendingInvitations();
  const acceptInvitation = useAcceptInvitation();

  if (isLoading || !invitations || invitations.length === 0) return null;

  return (
    <motion.div
      className="mb-6 space-y-3"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
        <Mail size={14} />
        <span>Pending invitations</span>
      </div>
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/60"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-border/60 shrink-0">
              <Building2 size={15} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {inv.organizationName}
              </p>
              <p className="text-xs text-muted-foreground">
                Invited as {inv.role ?? "member"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => acceptInvitation.mutate(inv.id)}
            disabled={acceptInvitation.isPending}
          >
            {acceptInvitation.isPending ? "Joining..." : "Join"}
          </Button>
        </div>
      ))}
    </motion.div>
  );
}

/* ── SummaryStrip ── */

function SummaryStrip({ projects }: { projects: ProjectStats[] }) {
  const totals = useMemo(() => {
    let items = 0, done = 0, sections = 0, activityCount = 0;
    for (const p of projects) {
      items += p.itemCount;
      done += p.doneCount;
      sections += p.sectionCount;
      activityCount += p.recentActivityCount;
    }
    const rate = items > 0 ? Math.round((done / items) * 100) : 0;
    return { projects: projects.length, items, done, sections, rate, activityCount };
  }, [projects]);

  const stats = [
    { label: "Projects", value: totals.projects, icon: FolderKanban, color: "text-blue-400" },
    { label: "Total Items", value: totals.items, icon: ListTodo, color: "text-amber-400" },
    { label: "Completed", value: totals.done, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Completion", value: `${totals.rate}%`, icon: TrendingUp, color: "text-violet-400" },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {stats.map((s) => (
        <motion.div
          key={s.label}
          variants={itemVariants}
          className="flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border/60"
        >
          <div className="flex items-center gap-2">
            <s.icon size={14} className={s.color} />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {s.label}
            </span>
          </div>
          <span className="text-2xl font-semibold font-mono tracking-tight text-foreground">
            {s.value}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── ProjectCard ── */

function ProjectCard({ project, onDelete }: { project: ProjectStats; onDelete: () => void }) {
  const pct = project.itemCount > 0 ? Math.round((project.doneCount / project.itemCount) * 100) : 0;

  return (
    <motion.div variants={cardVariants}>
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="group block"
      >
        <motion.div
          className="relative flex flex-col gap-3 p-5 rounded-xl bg-card border border-border/60 transition-colors hover:border-border"
          whileHover={{ y: -2, boxShadow: "0 8px 30px -12px rgba(0,0,0,0.15)" }}
          transition={{ duration: 0.2 }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-border/60 shrink-0">
                <FolderKanban size={15} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[220px]">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete project"
              >
                <Trash2 size={14} />
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{project.name}&rdquo; and all its sections, items, and notes. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Progress</span>
              <span className="text-[11px] text-muted-foreground font-mono">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-400" />
              <span className="font-mono">{project.doneCount}/{project.itemCount}</span>
              <span>items</span>
            </span>
            <span className="flex items-center gap-1">
              <LayoutGrid size={11} />
              <span className="font-mono">{project.sectionCount}</span>
              <span>sections</span>
            </span>
            {project.recentActivityCount > 0 && (
              <span className="flex items-center gap-1">
                <Activity size={11} className="text-blue-400" />
                <span className="font-mono">{project.recentActivityCount}</span>
                <span>this week</span>
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 pt-1 border-t border-border/40">
            <Clock size={10} />
            <span>Updated {timeAgo(project.updatedAt)}</span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ── DashboardPage ── */

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: projects, isLoading, error } = useProjectStats();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setName("");
    setDescription("");
    setOpen(false);
  };

  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">
          Failed to load projects: {error.message}
        </p>
      </div>
    );
  }

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-end justify-between">
          <div>
            {firstName && (
              <p className="text-xs text-muted-foreground mb-1">
                {getGreeting()}, {firstName}
              </p>
            )}
            <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button size="sm" className="gap-1.5">
                <Plus size={14} />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create a new project</DialogTitle>
                  <DialogDescription>
                    Add a project to start tracking releases.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input
                      id="project-name"
                      placeholder="Project name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-desc">Description (optional)</Label>
                    <Input
                      id="project-desc"
                      placeholder="Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  {createProject.isError && (
                    <p className="text-red-600 text-sm">
                      {createProject.error.message}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProject.isPending || !name.trim()}
                  >
                    {createProject.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <PendingInvitationsBanner />

      {!hasProjects ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            subtitle="Create your first project to start tracking test cases and releases."
            ctaLabel="Create project"
            onCta={() => setOpen(true)}
          />
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Summary strip */}
          <SummaryStrip projects={projects} />

          {/* Projects grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                All projects
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
            </div>
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              variants={gridVariants}
              initial="hidden"
              animate="show"
            >
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => deleteProject.mutate(project.id)}
                />
              ))}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
