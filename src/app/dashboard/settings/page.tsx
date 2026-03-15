"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut, organization } from "@/lib/auth-client";

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
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-8">Settings</h1>

      {/* User info */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-neutral-900 mb-4">Account</h2>
        <div className="rounded-md border border-neutral-200 p-4">
          <div className="mb-3">
            <span className="text-sm text-neutral-500">Name</span>
            <p className="text-sm text-neutral-900">
              {session?.user?.name ?? "--"}
            </p>
          </div>
          <div className="mb-4">
            <span className="text-sm text-neutral-500">Email</span>
            <p className="text-sm text-neutral-900">
              {session?.user?.email ?? "--"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Team members */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-neutral-900 mb-4">
          Team members
        </h2>
        <div className="rounded-md border border-neutral-200">
          {membersLoading ? (
            <p className="p-4 text-sm text-neutral-500">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No members found.</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {member.user.email}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-neutral-500 capitalize">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Invite form */}
      <section>
        <h2 className="text-sm font-medium text-neutral-900 mb-4">
          Invite a team member
        </h2>

        {inviteError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {inviteError}
          </div>
        )}

        {inviteSuccess && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Invitation sent successfully.
          </div>
        )}

        <form onSubmit={handleInvite} className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="teammate@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "member" | "admin")
              }
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={inviteLoading}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviteLoading ? "Sending..." : "Invite"}
          </button>
        </form>
      </section>
    </div>
  );
}
