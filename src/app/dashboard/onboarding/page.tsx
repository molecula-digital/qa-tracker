"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { organization } from "@/lib/auth-client";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(toSlug(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await organization.create({
        name,
        slug,
      });

      if (result.error) {
        setError(
          result.error.message ?? "Failed to create organization. Please try again."
        );
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-16">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
        Create your organization
      </h1>
      <p className="text-neutral-500 mb-8">
        Set up your team to start tracking releases.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="org-name"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Organization name
          </label>
          <input
            id="org-name"
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            placeholder="Acme Inc."
          />
        </div>

        <div>
          <label
            htmlFor="org-slug"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Slug
          </label>
          <input
            id="org-slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            placeholder="acme-inc"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Used in URLs. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create organization"}
        </button>
      </form>
    </div>
  );
}
