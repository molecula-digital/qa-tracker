"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut, organization } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Member {
  id: string;
  user: { name: string; email: string };
  role: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
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
        setInviteError(
          result.error.message ?? "Failed to send invite. Please try again."
        );
      } else {
        setInviteSuccess(true);
        setInviteEmail("");
        loadMembers();
      }
    } catch {
      setInviteError("An unexpected error occurred. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      {/* Account section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-sm text-foreground">
              {session?.user?.name ?? "--"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm text-foreground">
              {session?.user?.email ?? "--"}
            </p>
          </div>
          <Separator />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <p className="text-sm text-neutral-500">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-neutral-500">No members found.</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {member.user.email}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {member.role}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite a team member</CardTitle>
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
                onValueChange={(value) =>
                  setInviteRole(value as "member" | "admin")
                }
              >
                <SelectTrigger className="w-32">
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
