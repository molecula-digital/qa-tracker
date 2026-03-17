import { Hono } from "hono";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as notificationService from "@/server/services/notification-service";

const notifications = new Hono<OrgEnv>();
notifications.use("*", requireOrg);

notifications.get("/", async (c) => {
  const user = c.get("user");
  const list = await notificationService.getNotifications(user.id);
  return c.json(list);
});

notifications.get("/unread-count", async (c) => {
  const user = c.get("user");
  const count = await notificationService.getUnreadCount(user.id);
  return c.json({ count });
});

notifications.put("/:id/read", async (c) => {
  const user = c.get("user");
  await notificationService.markRead(user.id, c.req.param("id"));
  return c.json({ success: true });
});

notifications.put("/read-all", async (c) => {
  const user = c.get("user");
  await notificationService.markAllRead(user.id);
  return c.json({ success: true });
});

export default notifications;
