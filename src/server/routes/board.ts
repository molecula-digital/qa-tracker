import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { getBoard } from "@/server/services/board-service";

const board = new Hono<OrgEnv>();

board.use("*", requireOrg);

board.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const result = await getBoard(
      c.get("organizationId"),
      c.req.valid("query").projectId
    );
    if (!result) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

export default board;
