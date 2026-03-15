# Onboarding Flow Design

## Problem

Users who sign up without an invitation must create an organization before accessing the dashboard. Currently, the guard checks `session.activeOrganizationId` — meaning if a user deletes all their orgs, they're forced through onboarding again. We need a permanent one-time flag. Additionally, invited users should auto-join their organization and skip onboarding entirely.

## Decision: `onboardingFinished` flag

A boolean column on the `user` table. Once set to `true`, the user never sees onboarding again regardless of their organization state.

## Data Layer

### Schema Change

Add to `user` table in `src/server/db/schema/auth.ts`:

```ts
onboardingFinished: boolean("onboarding_finished").default(false).notNull(),
```

### Better Auth User Extension

In `src/lib/auth.ts`, register the field with Better Auth so it appears in session responses:

```ts
user: {
  additionalFields: {
    onboardingFinished: {
      type: "boolean",
      required: false,
      defaultValue: false,
      input: false, // not settable via sign-up
    },
  },
},
```

This is **required** — without it, `session.user.onboardingFinished` will be `undefined` on the client even though the DB column exists.

### Migration

Run `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate` to apply.

## Server-Side Auto-Join Hook

Location: `src/lib/auth.ts` — Better Auth `after` hook on `signUpEmail`.

### Logic

1. After user creation, extract `invitation` token from the request URL query params (passed via `fetchOptions.query` from the client's `signUp.email()` call).
2. **If token present:** Use direct Drizzle queries to accept the invitation — update `invitation.status` to `"accepted"`, insert a `member` row, and update `session.activeOrganizationId`. Set `onboardingFinished = true` on the user row. (We cannot use `auth.api.acceptInvitation` here because the session is still being established during the hook — no valid session cookie exists yet.)
3. **If no token:** Query the `invitation` table for pending invitations matching the new user's email.
4. **If invitations found:** Accept all pending invitations via direct Drizzle queries. Set the first accepted org as active on the session. Set `onboardingFinished = true` on the user row.
5. **If no invitations:** Leave `onboardingFinished = false`. User proceeds to onboarding.

### Why server-side?

- Guaranteed execution — no race conditions from client navigation.
- Centralized — one place for all sign-up-triggered logic.

### Google OAuth limitation

The `after` hook on `signUpEmail` only fires for email/password sign-ups. Google OAuth sign-ups go through a different code path (`signIn.social`). For now, Google OAuth users will always land on onboarding regardless of pending invitations. This is a known limitation — the same pattern can be extended to the OAuth hook later.

## Frontend Guard

### Middleware (`src/middleware.ts`)

The existing middleware checks for `better-auth.session_token` cookie. It does NOT need to check `onboardingFinished` directly since that requires a DB call. The middleware's job stays simple: redirect unauthenticated users away from `/dashboard/*` and authenticated users away from `/sign-in` and `/sign-up`.

### Dashboard Layout Guard (`src/app/dashboard/layout.tsx`)

Replace the current `activeOrganizationId` check:

```
Current:  if (!session.activeOrganizationId && path !== "/dashboard/onboarding") → redirect to onboarding
New:      if (!user.onboardingFinished && path !== "/dashboard/onboarding") → redirect to onboarding
```

Note: We do NOT block access to `/dashboard/onboarding` for users who already finished onboarding. The existing "Create workspace" link in the org switcher navigates to this page, and blocking it would break additional org creation for existing users. The onboarding page serves dual purpose: first-time onboarding and subsequent org creation.

This requires the layout to have access to the `onboardingFinished` flag via `useSession()`, which is why the `user.additionalFields` config above is required.

**Known tradeoff:** The layout is a client component using `useSession()` + `useEffect` for the redirect. This means users briefly see the dashboard shell before being redirected. This is the existing behavior — acceptable for now.

## Onboarding Page (`src/app/dashboard/onboarding/page.tsx`)

### Current behavior (kept)

- User enters org name, slug auto-generates
- Calls `organization.create()` to create the org

### New behavior (added)

- After successful org creation, call `POST /api/onboarding/complete` to set `onboardingFinished = true`
- Then redirect to `/dashboard`

### API for marking onboarding complete

Direct Drizzle update via `POST /api/onboarding/complete` in `src/server/routes/onboarding.ts`.

- Requires `requireAuth` middleware (user must be logged in)
- Sets `onboardingFinished = true` on the authenticated user's row
- Returns 200
- Idempotent — calling it again is a no-op

## Sign-Up Page (`src/app/(auth)/sign-up/page.tsx`)

- Read `invitation` query param from the URL
- Pass it to `signUp.email()` via `fetchOptions: { query: { invitation: token } }` so the server-side `after` hook can read it from the request URL query params
- After successful sign-up, redirect to `/dashboard` — the layout guard routes appropriately based on `onboardingFinished`

## Sign-In Page (`src/app/(auth)/sign-in/page.tsx`)

- No changes needed. Returning users are routed by the layout guard.

## Flow Diagrams

### New user, no invitation

```
Sign Up → server hook (no invitations found) → onboardingFinished=false
→ redirect to /dashboard → layout guard → redirect to /dashboard/onboarding
→ create org → POST /api/onboarding/complete → onboardingFinished=true
→ redirect to /dashboard → layout guard passes → dashboard loads
```

### New user, with invitation link

```
/sign-up?invitation=abc123 → Sign Up → server hook finds token
→ accept invitation (direct DB), set org active, onboardingFinished=true
→ redirect to /dashboard → layout guard passes → dashboard loads
```

### New user, invited by email (no link)

```
Sign Up → server hook checks email → finds pending invitation(s)
→ accept all (direct DB), set first org active, onboardingFinished=true
→ redirect to /dashboard → layout guard passes → dashboard loads
```

### Returning user, deleted all orgs

```
Sign In → redirect to /dashboard → layout guard checks onboardingFinished=true
→ dashboard loads (no org context, but no forced onboarding)
→ user can create org via org switcher "Create workspace" link → /dashboard/onboarding
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/server/db/schema/auth.ts` | Modify | Add `onboardingFinished` column to `user` table |
| `src/lib/auth.ts` | Modify | Add `user.additionalFields` config + `after` sign-up hook with direct Drizzle queries |
| `src/lib/auth-client.ts` | Modify | Add `onboardingFinished` to client-side user type inference if needed |
| `src/app/dashboard/layout.tsx` | Modify | Replace `activeOrganizationId` guard with `onboardingFinished` guard |
| `src/app/dashboard/onboarding/page.tsx` | Modify | Call onboarding-complete API after org creation |
| `src/app/(auth)/sign-up/page.tsx` | Modify | Pass invitation token via `fetchOptions.query` |
| `src/server/routes/onboarding.ts` | Create | `POST /api/onboarding/complete` endpoint |
| `src/server/app.ts` | Modify | Mount onboarding route |
| DB migration | Generate | Via `pnpm drizzle-kit generate` |

## Known Limitations

- **Google OAuth auto-join:** OAuth sign-ups don't trigger the `signUpEmail` hook. Google OAuth users will always hit onboarding. Can be extended later with the same pattern via OAuth hooks.
- **Layout flash:** The onboarding redirect happens client-side via `useEffect`, so users briefly see the dashboard shell. This is the existing behavior.
- **Multi-step onboarding:** Currently only org creation. Future work to add profile setup, invite teammates, etc.
