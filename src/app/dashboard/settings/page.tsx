"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut, organization } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2 } from "lucide-react";

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

    </div>
  );
}
