import { Hono } from "hono";
import { eq, and, gt, asc } from "drizzle-orm";
import { requireAuth, type AuthEnv } from "@/server/middleware/auth";
import { db } from "@/server/db";
import { user, invitation, organization, member, session } from "@/server/db/schema";

const onboarding = new Hono<AuthEnv>();

onboarding.use("*", requireAuth);

onboarding.post("/complete", async (c) => {
  const currentUser = c.get("user");

  await db
    .update(user)
    .set({ onboardingFinished: true })
    .where(eq(user.id, currentUser.id));

  return c.json({ success: true });
});

onboarding.get("/invitations", async (c) => {
  const currentUser = c.get("user");

  const pendingInvitations = await db
    .select({
      id: invitation.id,
      organizationId: invitation.organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(
      and(
        eq(invitation.email, currentUser.email),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date())
      )
    )
    .orderBy(asc(invitation.createdAt));

  return c.json(pendingInvitations);
});

onboarding.post("/accept-invitation", async (c) => {
  const currentUser = c.get("user");
  const currentSession = c.get("session");
  const body = await c.req.json<{ invitationId: string }>();

  if (!body.invitationId) {
    return c.json({ error: "invitationId is required" }, 400);
  }

  const [inv] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.id, body.invitationId),
        eq(invitation.email, currentUser.email),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!inv) {
    return c.json({ error: "Invitation not found or expired" }, 404);
  }

  // Accept the invitation
  await db
    .update(invitation)
    .set({ status: "accepted" })
    .where(eq(invitation.id, inv.id));

  // Add user as member
  await db.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: inv.organizationId,
    userId: currentUser.id,
    role: inv.role ?? "member",
    createdAt: new Date(),
  });

  // Set as active organization
  await db
    .update(session)
    .set({ activeOrganizationId: inv.organizationId })
    .where(eq(session.id, currentSession.id));

  // Mark onboarding as finished if not already
  if (!currentUser.onboardingFinished) {
    await db
      .update(user)
      .set({ onboardingFinished: true })
      .where(eq(user.id, currentUser.id));
  }

  return c.json({ success: true, organizationId: inv.organizationId });
});

export default onboarding;
