import { createMiddleware } from "hono/factory";
import { auth, type Session } from "@/lib/auth";

export type AuthEnv = {
  Variables: {
    session: Session["session"];
    user: Session["user"];
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("session", session.session);
  c.set("user", session.user);
  await next();
});
