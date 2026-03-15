import { Hono } from "hono";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { createTools } from "@/server/ai/tools";
import { db } from "@/server/db";
import { organization } from "@/server/db/schema/auth";
import { eq } from "drizzle-orm";

const chat = new Hono<OrgEnv>();

chat.use("*", requireOrg);

// Simple in-memory rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 20) return false;

  entry.count++;
  return true;
}

chat.post("/", async (c) => {
  const user = c.get("user");
  const orgId = c.get("organizationId");

  if (!checkRateLimit(user.id)) {
    return c.json({ error: "Rate limit exceeded. Max 20 requests per minute." }, 429);
  }

  const body = await c.req.json();
  const messages: UIMessage[] = body.messages;
  const context: { projectId?: string; route?: string } = body.context ?? {};

  // Get org name for system prompt
  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId));
  const orgName = org?.name ?? "Unknown";

  const systemPrompt = `You are Retrack AI, an assistant for the Retrack release tracker.
You help users manage their projects, sections, items, notes, and links.

Current context:
- Organization: ${orgName}
- Current page: ${context.route ?? "unknown"}
- Active project: ${context.projectId ?? "none"}

When the user refers to "this project" or doesn't specify a project, use the active project ID: ${context.projectId ?? "none"}.
If no project is active and the operation requires one, ask which project.

For destructive actions (deletes), you will ask for user approval before executing.
Notes are immutable — they can be created and deleted but not edited.
Keep responses concise and action-oriented.`;

  const tools = createTools(orgId, user.id, user.name ?? user.email);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10),
    maxOutputTokens: 2048,
  });

  return result.toUIMessageStreamResponse();
});

export default chat;
