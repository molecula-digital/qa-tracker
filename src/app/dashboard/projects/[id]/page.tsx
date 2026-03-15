"use client";

import { use } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/use-projects";
import { useSections } from "@/hooks/use-sections";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading: loadingProject, error: projectError } = useProject(id);
  const { data: sections, isLoading: loadingSections } = useSections(id);

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

      <div className="rounded-lg border border-neutral-200 p-4">
        <p className="text-sm text-neutral-600">
          {loadingSections
            ? "Loading sections..."
            : `${sections?.length ?? 0} section${sections?.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}
