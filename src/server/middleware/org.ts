import { createMiddleware } from "hono/factory";
import { auth, type Session } from "@/lib/auth";

export type OrgEnv = {
  Variables: {
    session: Session["session"];
    user: Session["user"];
    organizationId: string;
  };
};

export const requireOrg = createMiddleware<OrgEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    return c.json({ error: "No active organization" }, 403);
  }

  c.set("session", session.session);
  c.set("user", session.user);
  c.set("organizationId", orgId);
  await next();
});
