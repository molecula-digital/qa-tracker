# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent `onboardingFinished` flag to users, auto-join invited users to their orgs on sign-up, and guard the dashboard behind onboarding completion.

**Architecture:** Add `onboardingFinished` boolean to the `user` table, register it as a Better Auth `additionalField` so it appears in session data, use a server-side `after` hook on `signUpEmail` to auto-accept invitations and set the flag, create a small API endpoint for marking onboarding complete after manual org creation, and update the dashboard layout guard.

**Tech Stack:** Next.js 15, Better Auth, Drizzle ORM, Hono, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-15-onboarding-design.md`

---

## Chunk 1: Data Layer & Auth Config

### Task 1: Add `onboardingFinished` column to user schema

**Files:**
- Modify: `src/server/db/schema/auth.ts:12-24`

- [ ] **Step 1: Add the column**

In `src/server/db/schema/auth.ts`, add `onboardingFinished` to the `user` table definition, after the `stripeCustomerId` field:

```ts
onboardingFinished: boolean("onboarding_finished").default(false).notNull(),
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm drizzle-kit generate`

Expected: A new migration file appears in the migrations directory.

- [ ] **Step 3: Apply the migration**

Run: `pnpm drizzle-kit migrate`

Expected: Migration applies successfully. The `user` table now has an `onboarding_finished` column.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/auth.ts drizzle/
git commit -m "feat: add onboardingFinished column to user table"
```

---

### Task 2: Register `onboardingFinished` as a Better Auth additional field and sync types to client

**Files:**
- Modify: `src/lib/auth.ts:10-56`
- Modify: `src/lib/auth-client.ts:1-21`

- [ ] **Step 1: Add `user.additionalFields` to the Better Auth server config**

In `src/lib/auth.ts`, add the `user` config block to `betterAuth()` options (after `socialProviders` and before `plugins`):

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      onboardingFinished: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    // ... existing plugins unchanged
  ],
});
```

The `input: false` prevents clients from setting this field during sign-up.

- [ ] **Step 2: Add `inferAdditionalFields` plugin to the auth client**

In `src/lib/auth-client.ts`, add the `inferAdditionalFields` plugin so TypeScript knows about `session.user.onboardingFinished`:

```ts
import { createAuthClient } from "better-auth/react";
import { organizationClient, inferAdditionalFields } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    organizationClient(),
    stripeClient({ subscription: true }),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization,
  subscription,
} = authClient;
```

This eliminates the need for `as any` casts when accessing `session.user.onboardingFinished` on the client.

- [ ] **Step 3: Verify the app compiles**

Run: `pnpm build`

Expected: Builds without errors. The `Session` type now includes `onboardingFinished` on the user object both server-side and client-side.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-client.ts
git commit -m "feat: register onboardingFinished as Better Auth additional field with client type inference"
```

---

## Chunk 2: Server-Side Auto-Join Hook

### Task 3: Add `after` sign-up hook for invitation auto-join

**Files:**
- Modify: `src/lib/auth.ts`

This hook runs after email/password sign-up. It checks for an invitation token in the query params, or falls back to looking up pending invitations by email. If found, it accepts them via direct Drizzle queries (since the session isn't fully established yet in the hook context).

- [ ] **Step 1: Add imports for Drizzle schema and operators**

At the top of `src/lib/auth.ts`, add:

```ts
import { eq, and, gt, asc } from "drizzle-orm";
import * as schema from "@/server/db/schema";
```

- [ ] **Step 2: Add the `after` hook to `betterAuth()` config**

Add a `hooks` block inside the `betterAuth()` config (after the `user` block, before `plugins`):

```ts
hooks: {
  after: [
    {
      matcher(context) {
        return context.path === "/sign-up/email";
      },
      async handler(ctx) {
        // Extract the new user from the hook context
        // Better Auth's after hook provides the response body and the original request
        const newUser = ctx.context.returned as { user?: { id: string; email: string } } | undefined;
        if (!newUser?.user?.id || !newUser?.user?.email) return;

        const userId = newUser.user.id;
        const userEmail = newUser.user.email;

        // Parse the invitation token from the original request URL query params
        // The client sends it via fetchOptions.query which appends to the POST URL
        const url = new URL(ctx.context.request.url);
        const invitationToken = url.searchParams.get("invitation");

        const now = new Date();
        let acceptedOrgId: string | null = null;

        if (invitationToken) {
          // Accept specific invitation by ID, checking expiry
          const [inv] = await db
            .select()
            .from(schema.invitation)
            .where(
              and(
                eq(schema.invitation.id, invitationToken),
                eq(schema.invitation.status, "pending"),
                gt(schema.invitation.expiresAt, now)
              )
            )
            .limit(1);

          if (inv) {
            await db
              .update(schema.invitation)
              .set({ status: "accepted" })
              .where(eq(schema.invitation.id, inv.id));

            await db.insert(schema.member).values({
              id: crypto.randomUUID(),
              organizationId: inv.organizationId,
              userId,
              role: inv.role ?? "member",
              createdAt: now,
            });

            acceptedOrgId = inv.organizationId;
          }
        }

        if (!acceptedOrgId) {
          // Fallback: check for pending, non-expired invitations by email
          const pendingInvitations = await db
            .select()
            .from(schema.invitation)
            .where(
              and(
                eq(schema.invitation.email, userEmail),
                eq(schema.invitation.status, "pending"),
                gt(schema.invitation.expiresAt, now)
              )
            )
            .orderBy(asc(schema.invitation.createdAt));

          for (const inv of pendingInvitations) {
            await db
              .update(schema.invitation)
              .set({ status: "accepted" })
              .where(eq(schema.invitation.id, inv.id));

            await db.insert(schema.member).values({
              id: crypto.randomUUID(),
              organizationId: inv.organizationId,
              userId,
              role: inv.role ?? "member",
              createdAt: now,
            });

            if (!acceptedOrgId) {
              acceptedOrgId = inv.organizationId;
            }
          }
        }

        if (acceptedOrgId) {
          // Mark onboarding as done
          await db
            .update(schema.user)
            .set({ onboardingFinished: true })
            .where(eq(schema.user.id, userId));

          // Set active org on the user's session
          const [userSession] = await db
            .select()
            .from(schema.session)
            .where(eq(schema.session.userId, userId))
            .limit(1);

          if (userSession) {
            await db
              .update(schema.session)
              .set({ activeOrganizationId: acceptedOrgId })
              .where(eq(schema.session.id, userSession.id));
          }
        }
      },
    },
  ],
},
```

**Important:** The exact shape of `ctx` in Better Auth `after` hooks may vary between versions. Before implementing, check the Better Auth docs (`@better-auth` skill or Context7) for the current `after` hook signature. The key data needed is:
- The new user's `id` and `email` (from the response body)
- The original request URL (for the `invitation` query param)

If `ctx.context.returned` does not contain the user, try `ctx.context.body` (the response body) or query the user from the DB using the request body email.

- [ ] **Step 3: Verify the app compiles**

Run: `pnpm build`

Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: auto-join invitations on email sign-up via after hook"
```

---

## Chunk 3: Onboarding Complete API Endpoint

### Task 4: Create `POST /api/onboarding/complete` route

**Files:**
- Create: `src/server/routes/onboarding.ts`
- Modify: `src/server/app.ts:1-34`

The Hono app has `.basePath("/api")`, so mounting at `/onboarding` creates the full path `/api/onboarding/complete`.

- [ ] **Step 1: Create the route file**

Create `src/server/routes/onboarding.ts`:

```ts
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/server/middleware/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

const onboarding = new Hono();

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
```

Note: Uses `@/` alias imports consistent with all other routes in the project.

- [ ] **Step 2: Mount the route in the Hono app**

In `src/server/app.ts`, add the import:

```ts
import onboarding from "./routes/onboarding";
```

Add after the existing routes (before `export default app`):

```ts
app.route("/onboarding", onboarding);
```

- [ ] **Step 3: Verify the app compiles**

Run: `pnpm build`

Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/onboarding.ts src/server/app.ts
git commit -m "feat: add POST /api/onboarding/complete endpoint"
```

---

## Chunk 4: Frontend Changes

### Task 5: Update the dashboard layout guard

**Files:**
- Modify: `src/app/dashboard/layout.tsx:100-109`

- [ ] **Step 1: Replace the `activeOrganizationId` guard with `onboardingFinished` guard**

In `src/app/dashboard/layout.tsx`, find the existing guard `useEffect` (around lines 100-109):

```ts
  useEffect(() => {
    if (isPending) return;
    if (
      session &&
      !session.session.activeOrganizationId &&
      pathname !== "/dashboard/onboarding"
    ) {
      router.push("/dashboard/onboarding");
    }
  }, [session, isPending, pathname, router]);
```

Replace it with:

```ts
  useEffect(() => {
    if (isPending) return;
    if (
      session &&
      !session.user.onboardingFinished &&
      pathname !== "/dashboard/onboarding"
    ) {
      router.push("/dashboard/onboarding");
    }
  }, [session, isPending, pathname, router]);
```

Note: No `as any` cast needed — the `inferAdditionalFields` plugin added in Task 2 provides the correct type.

- [ ] **Step 2: Verify the app compiles**

Run: `pnpm build`

Expected: Builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: guard dashboard behind onboardingFinished flag"
```

---

### Task 6: Update onboarding page to call complete API and refresh session

**Files:**
- Modify: `src/app/dashboard/onboarding/page.tsx:33-56`

- [ ] **Step 1: Add the onboarding complete call after org creation with error handling and session refresh**

In `src/app/dashboard/onboarding/page.tsx`, update the `handleSubmit` function. After the successful `organization.create()` call, call the complete endpoint, handle errors, and use a full page navigation to avoid stale session cache.

Find:
```ts
      if (result.error) {
        setError(
          result.error.message ?? "Failed to create organization. Please try again."
        );
      } else {
        router.push("/dashboard");
      }
```

Replace with:
```ts
      if (result.error) {
        setError(
          result.error.message ?? "Failed to create organization. Please try again."
        );
      } else {
        const res = await fetch("/api/onboarding/complete", { method: "POST" });
        if (!res.ok) {
          setError("Failed to complete setup. Please try again.");
          return;
        }
        // Use full page navigation to ensure the session cache is refreshed
        // router.push would use the stale useSession() cache where onboardingFinished is still false
        window.location.href = "/dashboard";
      }
```

**Why `window.location.href` instead of `router.push`?** After calling `/api/onboarding/complete`, the DB is updated but the client-side `useSession()` cache still holds `onboardingFinished: false`. If we use `router.push("/dashboard")`, the layout guard fires with stale data and redirects back to onboarding — an infinite loop. A full page navigation forces the session to be re-fetched from the server.

- [ ] **Step 2: Verify the app compiles**

Run: `pnpm build`

Expected: Builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/onboarding/page.tsx
git commit -m "feat: mark onboarding complete after org creation"
```

---

### Task 7: Pass invitation token from sign-up page

**Files:**
- Modify: `src/app/(auth)/sign-up/page.tsx`

- [ ] **Step 1: Wrap the component in Suspense and add `useSearchParams`**

`useSearchParams()` in Next.js 15 **always** requires a `Suspense` boundary for client components. Restructure the file:

1. Add imports at the top:

```ts
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
```

2. Rename the existing `SignUpPage` component to `SignUpForm`.

3. Inside `SignUpForm`, after the existing `useState` declarations, add:

```ts
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation");
```

4. Create the new default export that wraps in Suspense:

```ts
export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: Pass the invitation token to `signUp.email()`**

In the `handleSubmit` function inside `SignUpForm`, update the `signUp.email()` call. Find:

```ts
      const result = await signUp.email({
        name,
        email,
        password,
      });
```

Replace with:

```ts
      const result = await signUp.email({
        name,
        email,
        password,
        fetchOptions: invitationToken
          ? { query: { invitation: invitationToken } }
          : undefined,
      });
```

- [ ] **Step 3: Pass the invitation token for Google OAuth sign-up**

In the `handleGoogleSignUp` function, update the `callbackURL` to preserve the token for future OAuth auto-join support. Find:

```ts
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
```

Replace with:

```ts
      await signIn.social({
        provider: "google",
        callbackURL: invitationToken
          ? `/dashboard?invitation=${invitationToken}`
          : "/dashboard",
      });
```

Note: Google OAuth users will still hit the onboarding flow for now since the server-side `after` hook only fires for `signUpEmail`. This preserves the token for when OAuth auto-join is added later.

- [ ] **Step 4: Verify the app compiles**

Run: `pnpm build`

Expected: Builds without errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/sign-up/page.tsx"
git commit -m "feat: pass invitation token through sign-up flow"
```

---

## Chunk 5: Manual Testing & Verification

### Task 8: Manual testing checklist

- [ ] **Step 1: Test new user without invitation**

1. Sign up with a new email at `/sign-up`
2. Should redirect to `/dashboard` → layout guard redirects to `/dashboard/onboarding`
3. Create an org → should call `/api/onboarding/complete` → full page redirect to `/dashboard`
4. Verify `onboarding_finished` is `true` in the DB for this user

- [ ] **Step 2: Test new user with email invitation**

1. From an existing account, invite `newuser@test.com` to an org
2. Sign up as `newuser@test.com` at `/sign-up`
3. Should redirect straight to `/dashboard` with the org already active
4. Verify `onboarding_finished` is `true` and user is a member of the org

- [ ] **Step 3: Test new user with invitation link**

1. From an existing account, invite a user and get the invitation ID
2. Navigate to `/sign-up?invitation=<id>`
3. Sign up → should land on `/dashboard` with the org active
4. Verify the invitation status is `"accepted"` in the DB

- [ ] **Step 4: Test expired invitation is rejected**

1. Set an invitation's `expires_at` to a past date in the DB
2. Sign up with that email → should NOT auto-join the org
3. Should be redirected to onboarding to create their own org

- [ ] **Step 5: Test returning user with deleted orgs**

1. Take a user with `onboarding_finished = true`
2. Delete all their orgs
3. Sign in → should see `/dashboard` (not forced to onboarding)
4. Can click "Create workspace" in sidebar → navigates to `/dashboard/onboarding`

- [ ] **Step 6: Test existing org creation still works**

1. Sign in as a user with `onboarding_finished = true` and an active org
2. Click "Create workspace" in the org switcher
3. Should load `/dashboard/onboarding` and let them create another org
4. After creation, should redirect to `/dashboard`

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: onboarding flow with auto-join invitations"
```
