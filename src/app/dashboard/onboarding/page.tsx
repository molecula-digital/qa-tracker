"use client";

import { useState, useEffect } from "react";
import { organization } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PendingInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string | null;
  expiresAt: string;
  createdAt: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvitations() {
      try {
        const res = await fetch("/api/onboarding/invitations");
        if (res.ok) {
          const data = await res.json();
          setInvitations(data);
        }
      } catch {
        // Silently fail — user can still create an org
      } finally {
        setLoadingInvitations(false);
      }
    }
    fetchInvitations();
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(toSlug(value));
    }
  }

  async function handleAcceptInvitation(invitationId: string) {
    setError(null);
    setAcceptingId(invitationId);

    try {
      const res = await fetch("/api/onboarding/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to accept invitation. Please try again.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setAcceptingId(null);
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
        const res = await fetch("/api/onboarding/complete", { method: "POST" });
        if (!res.ok) {
          setError("Failed to complete setup. Please try again.");
          return;
        }
        // Use full page navigation to ensure the session cache is refreshed
        // router.push would use the stale useSession() cache where onboardingFinished is still false
        window.location.href = "/dashboard";
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-16">
      {error && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loadingInvitations && invitations.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">You have been invited</CardTitle>
            <CardDescription>
              Join an existing organization to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{inv.organizationName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {inv.organizationSlug}
                    </span>
                    {inv.role && (
                      <Badge variant="secondary" className="text-xs">
                        {inv.role}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAcceptInvitation(inv.id)}
                  disabled={acceptingId !== null}
                >
                  {acceptingId === inv.id ? "Joining..." : "Join"}
                </Button>
              </div>
            ))}

            <Separator className="my-2" />
            <p className="text-center text-xs text-muted-foreground">
              Or create a new organization below
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create your organization</CardTitle>
          <CardDescription>
            Set up your team to start tracking releases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                placeholder="acme-inc"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
