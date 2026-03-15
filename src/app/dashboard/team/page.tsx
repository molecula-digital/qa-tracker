"use client";

import { useState, useEffect, useCallback } from "react";
import { organization } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Mail, X, AlertTriangle, Building2 } from "lucide-react";

interface Member {
  id: string;
  user: { name: string; email: string };
  role: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [currentOrg, setCurrentOrg] = useState<OrgInfo | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Workspace edit state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Delete workspace state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const result = await organization.getFullOrganization();
      if (result.data) {
        setCurrentOrg({ id: result.data.id, name: result.data.name, slug: result.data.slug });
        setOrgName(result.data.name);
        setOrgSlug(result.data.slug);
      }
      if (result.data?.members) {
        setMembers(result.data.members as unknown as Member[]);
      }
      if (result.data?.invitations) {
        const pending = (result.data.invitations as unknown as Invitation[]).filter(
          (inv) => inv.status === "pending"
        );
        setInvitations(pending);
      }
    } catch {
      // silently fail
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    setInviteLoading(true);

    try {
      const result = await organization.inviteMember({
        email: inviteEmail,
        role: inviteRole,
      });

      if (result.error) {
        setInviteError(result.error.message ?? "Failed to send invite.");
      } else {
        setInviteSuccess(true);
        setInviteEmail("");
        loadMembers();
      }
    } catch {
      setInviteError("An unexpected error occurred.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, role: string | null) {
    if (!role) return;
    await organization.updateMemberRole({ memberId, role });
    loadMembers();
  }

  async function handleRemove(memberIdOrEmail: string) {
    await organization.removeMember({ memberIdOrEmail });
    loadMembers();
  }

  async function handleCancelInvitation(invitationId: string) {
    await organization.cancelInvitation({ invitationId });
    loadMembers();
  }

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setOrgSaving(true);
    setOrgSaved(false);
    try {
      await organization.update({
        data: { name: orgName, slug: orgSlug },
      });
      setOrgSaved(true);
      loadMembers();
      setTimeout(() => setOrgSaved(false), 3000);
    } catch {
      // handle error
    } finally {
      setOrgSaving(false);
    }
  }

  async function handleDeleteOrg() {
    if (!currentOrg || deleteConfirm !== currentOrg.name) return;
    setDeleting(true);
    try {
      await organization.delete({ organizationId: currentOrg.id });

      // Check if user has other orgs to switch to
      const orgsResult = await organization.list();
      const remainingOrgs = orgsResult.data;

      if (remainingOrgs && remainingOrgs.length > 0) {
        // Switch to the first available org and reload
        await organization.setActive({ organizationId: remainingOrgs[0].id });
        window.location.href = "/dashboard";
      } else {
        // No orgs left — send to onboarding
        window.location.href = "/dashboard/onboarding";
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Team</h1>

      {/* Workspace settings */}
      {currentOrg && (
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
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-accent text-foreground">
                        {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role !== "owner" ? (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(role) => handleRoleChange(member.id, role)}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleRemove(member.id)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="capitalize">Owner</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-muted-foreground" />
              <CardTitle className="text-base">Pending invitations</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                {invitations.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {inv.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {inv.role ?? "member"} &middot; expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-400"
                    onClick={() => handleCancelInvitation(inv.id)}
                    title="Cancel invitation"
                  >
                    <X size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Invite */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-muted-foreground" />
            <CardTitle className="text-base">Invite a team member</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {inviteError && (
            <div className="mb-4 rounded-md border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div className="mb-4 rounded-md border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-400">
              Invitation sent successfully.
            </div>
          )}
          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "member" | "admin")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviteLoading}>
              {inviteLoading ? "Sending..." : "Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      {currentOrg && (
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
              Deleting this workspace will permanently remove all projects, sections,
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
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{currentOrg?.name}</strong> and all its data.
              Type the workspace name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder={currentOrg?.name}
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
                disabled={deleteConfirm !== currentOrg?.name || deleting}
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
