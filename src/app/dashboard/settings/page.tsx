"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut, organization } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Building2, AlertTriangle } from "lucide-react";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  // Org edit state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadOrg = useCallback(async () => {
    try {
      const result = await organization.getFullOrganization();
      if (result.data) {
        const data = {
          id: result.data.id,
          name: result.data.name,
          slug: result.data.slug,
          logo: result.data.logo,
        };
        setOrg(data);
        setOrgName(data.name);
        setOrgSlug(data.slug);
      }
    } catch {
      // silently fail
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setOrgSaving(true);
    setOrgSaved(false);
    try {
      await organization.update({
        data: {
          name: orgName,
          slug: orgSlug,
        },
      });
      setOrgSaved(true);
      loadOrg();
      setTimeout(() => setOrgSaved(false), 3000);
    } catch {
      // handle error
    } finally {
      setOrgSaving(false);
    }
  }

  async function handleDeleteOrg() {
    if (!org || deleteConfirm !== org.name) return;
    setDeleting(true);
    try {
      await organization.delete({ organizationId: org.id });
      router.push("/dashboard/onboarding");
    } catch {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      {/* Workspace settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Workspace</CardTitle>
              <CardDescription className="text-xs">
                Manage your organization settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orgLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : org ? (
            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Workspace name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">URL slug</Label>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs and invitations
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={orgSaving} size="sm">
                  {orgSaving ? "Saving..." : "Save changes"}
                </Button>
                {orgSaved && (
                  <span className="text-xs text-emerald-400">Saved</span>
                )}
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">No workspace found.</p>
          )}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Name</p>
              <p className="text-sm text-foreground">{session?.user?.name ?? "--"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <p className="text-sm text-foreground">{session?.user?.email ?? "--"}</p>
            </div>
          </div>
          <Separator />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <div>
              <CardTitle className="text-base text-red-400">Danger zone</CardTitle>
              <CardDescription className="text-xs">
                Irreversible actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Deleting your workspace will permanently remove all projects, sections,
            items, and member data. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300"
            onClick={() => setDeleteOpen(true)}
          >
            Delete workspace
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{org?.name}</strong> and all its data.
              Type the workspace name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder={org?.name}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirm !== org?.name || deleting}
                onClick={handleDeleteOrg}
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
