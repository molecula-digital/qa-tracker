import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as noteService from "@/server/services/note-service";

const notes = new Hono<OrgEnv>();

notes.use("*", requireOrg);

notes.get(
  "/",
  zValidator("query", z.object({ itemId: z.string().min(1) })),
  async (c) => {
    const result = await noteService.getItemNotes(
      c.get("organizationId"),
      c.req.valid("query").itemId
    );
    if (result === null) return c.json({ error: "Item not found" }, 404);
    return c.json(result);
  }
);

notes.post(
  "/",
  zValidator(
    "json",
    z.object({
      itemId: z.string().min(1),
      text: z.string().min(1).max(2000),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const result = await noteService.createNote(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.valid("json")
    );
    if ("error" in result) return c.json(result, 404);
    return c.json(result, 201);
  }
);

notes.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await noteService.deleteNote(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default notes;
