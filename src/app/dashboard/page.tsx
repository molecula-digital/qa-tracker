"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/use-projects";

export default function DashboardPage() {
  const { data: projects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [showForm, setShowForm] = useState(false);
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
    setShowForm(false);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Projects</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
        >
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-neutral-200 p-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={createProject.isPending || !name.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {createProject.isPending ? "Creating..." : "Create"}
          </button>
          {createProject.isError && (
            <p className="text-red-600 text-sm">
              {createProject.error.message}
            </p>
          )}
        </form>
      )}

      {!projects || projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-neutral-500 text-sm">
            No projects yet. Create one to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition-colors"
            >
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {project.name}
                </p>
                {project.description && (
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {project.description}
                  </p>
                )}
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm("Delete this project?")) {
                    deleteProject.mutate(project.id);
                  }
                }}
                className="ml-4 shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
