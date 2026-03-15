import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthEnv } from "@/server/middleware/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

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

export default onboarding;
