"use client";

import { useState, useEffect, useCallback } from "react";
import { organization } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";

interface Member {
  id: string;
  user: { name: string; email: string };
  role: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const result = await organization.getFullOrganization();
      if (result.data?.members) {
        setMembers(result.data.members as unknown as Member[]);
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

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Team</h1>

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
                      <AvatarFallback className="text-xs bg-neutral-800 text-neutral-300">
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
    </div>
  );
}
