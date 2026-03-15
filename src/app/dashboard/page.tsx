"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/use-projects";
import { Card, CardContent } from "@/components/ui/card";
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

export default function DashboardPage() {
  const { data: projects, isLoading, error } = useProjects();
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

  if (isLoading) {
    return <p className="text-neutral-500 text-sm">Loading projects...</p>;
  }

  if (error) {
    return (
      <p className="text-red-600 text-sm">
        Failed to load projects: {error.message}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button>New project</Button>
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

      {!projects || projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-neutral-500 text-sm">
              No projects yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group hover:border-neutral-400 transition-colors"
            >
              <CardContent className="p-5 flex items-center justify-between">
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="text-xs text-neutral-500 truncate mt-1">
                      {project.description}
                    </p>
                  )}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-4 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm("Delete this project?")) {
                      deleteProject.mutate(project.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
