import { Hono } from "hono";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { db } from "@/server/db";
import { member, user } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const members = new Hono<OrgEnv>();
members.use("*", requireOrg);

members.get("/", async (c) => {
  const orgId = c.get("organizationId");
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, orgId));
  return c.json(rows);
});

export default members;
