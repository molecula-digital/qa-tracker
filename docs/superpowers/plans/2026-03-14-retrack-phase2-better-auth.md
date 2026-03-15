# Phase 2: Better Auth (Auth + Organizations + Stripe)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement authentication (sign-in/sign-up), organization management, and Stripe billing using Better Auth and its plugins.

**Architecture:** Better Auth server config in `src/lib/auth.ts`, mounted inside Hono at `/api/auth/*`. Client-side auth via `src/lib/auth-client.ts`. Organizations plugin for multi-tenancy. Stripe plugin for billing. Middleware protects `/dashboard/*` routes.

**Tech Stack:** Better Auth, @better-auth/stripe, Drizzle adapter, Stripe SDK, Next.js middleware

---

## File Structure

```
src/
├── lib/
│   ├── auth.ts                      # Better Auth server config
│   └── auth-client.ts               # Better Auth client instance
├── server/
│   ├── app.ts                       # Mount auth routes in Hono
│   └── middleware/
│       └── auth.ts                  # Hono middleware for session validation
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx               # Auth pages layout (centered card)
│   │   ├── sign-in/page.tsx         # Sign-in form
│   │   └── sign-up/page.tsx         # Sign-up form
│   └── dashboard/
│       ├── layout.tsx               # Add org context + sidebar
│       ├── settings/page.tsx        # User & org settings
│       └── billing/page.tsx         # Billing page
└── middleware.ts                     # Next.js edge middleware (auth redirect)
```

---

### Task 1: Install Better Auth + Plugins

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Better Auth core and plugins**

```bash
pnpm add better-auth @better-auth/stripe stripe
```

- [ ] **Step 2: Add Stripe env vars to `.env.local`**

Append to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_TEAM=price_team_monthly_id
STRIPE_PRICE_ID_BUSINESS=price_business_monthly_id
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml .env.local
git commit -m "chore: install better-auth with stripe plugin"
```

---

### Task 2: Configure Better Auth Server

**Files:**
- Create: `src/lib/auth.ts`
- Modify: `src/server/db/schema/index.ts` (add auth tables after generation)

- [ ] **Step 1: Create `src/lib/auth.ts`**

```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { db } from "@/server/db";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      membershipLimit: async (_user, org) => {
        // Limit based on subscription plan
        const meta = org?.metadata as Record<string, string> | undefined;
        if (meta?.plan === "business") return 15;
        if (meta?.plan === "team") return 3;
        return 1; // Free
      },
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "team",
            priceId: process.env.STRIPE_PRICE_ID_TEAM!,
            limits: {
              members: 3,
              projects: 10,
            },
          },
          {
            name: "business",
            priceId: process.env.STRIPE_PRICE_ID_BUSINESS!,
            limits: {
              members: 15,
              projects: 999999,
            },
          },
        ],
        authorizeReference: async ({ user, referenceId, action }) => {
          // Only org owners/admins can manage billing
          const member = await auth.api.getActiveMember({
            headers: new Headers(),
            query: { organizationId: referenceId },
          }).catch(() => null);
          return member?.role === "owner" || member?.role === "admin";
        },
      },
      organization: {
        enabled: true,
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Generate auth schema tables**

```bash
npx @better-auth/cli@latest generate --config src/lib/auth.ts --output src/server/db/schema/auth.ts
```

Then add the export to `src/server/db/schema/index.ts`:

```ts
export * from "./auth";
```

- [ ] **Step 3: Run Drizzle migration for auth tables**

```bash
pnpm db:generate
pnpm db:push
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure better-auth with org and stripe plugins"
```

---

### Task 3: Mount Auth in Hono + Create Auth Client

**Files:**
- Modify: `src/server/app.ts`
- Create: `src/lib/auth-client.ts`

- [ ] **Step 1: Mount auth handler in Hono `src/server/app.ts`**

```ts
// src/server/app.ts
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "@/lib/auth";
import health from "./routes/health";

const app = new Hono().basePath("/api");

app.use("*", logger());

// Mount Better Auth — handles all /api/auth/* routes
app.on(["GET", "POST"], "/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/health", health);

export default app;
export type AppType = typeof app;
```

- [ ] **Step 2: Create auth client `src/lib/auth-client.ts`**

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    organizationClient(),
    stripeClient({ subscription: true }),
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

- [ ] **Step 3: Add `NEXT_PUBLIC_APP_URL` to `.env.local`**

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: Verify auth endpoint responds**

```bash
curl http://localhost:3000/api/auth/ok
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mount better-auth in hono and create auth client"
```

---

### Task 4: Build Sign-In and Sign-Up Pages

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`

- [ ] **Step 1: Create auth layout `src/app/(auth)/layout.tsx`**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build sign-in page `src/app/(auth)/sign-in/page.tsx`**

```tsx
// src/app/(auth)/sign-in/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message || "Invalid credentials");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-serif)" }}>
        Sign in to Retrack
      </h1>
      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-neutral-500 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-neutral-900 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Build sign-up page `src/app/(auth)/sign-up/page.tsx`**

```tsx
// src/app/(auth)/sign-up/page.tsx
"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      setError(error.message || "Could not create account");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-serif)" }}>
        Create your Retrack account
      </h1>
      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-neutral-500 text-center">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-neutral-900 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify auth pages render**

Visit `http://localhost:3000/sign-in` and `http://localhost:3000/sign-up`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add sign-in and sign-up pages"
```

---

### Task 5: Add Next.js Middleware for Route Protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up");

  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  // Redirect authenticated users away from auth pages
  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to sign-in
  if (isDashboard && !sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
```

- [ ] **Step 2: Test middleware behavior**

Without a session cookie, visiting `/dashboard` should redirect to `/sign-in`.
With a session cookie, visiting `/sign-in` should redirect to `/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware for route protection"
```

---

### Task 6: Create Hono Auth Middleware for API Routes

**Files:**
- Create: `src/server/middleware/auth.ts`

- [ ] **Step 1: Create `src/server/middleware/auth.ts`**

```ts
// src/server/middleware/auth.ts
import { createMiddleware } from "hono/factory";
import { auth, type Session } from "@/lib/auth";

type AuthEnv = {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/server/middleware/auth.ts
git commit -m "feat: add hono auth middleware for api route protection"
```

---

### Task 7: Build Organization Onboarding Flow

**Files:**
- Create: `src/app/dashboard/onboarding/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create onboarding page `src/app/dashboard/onboarding/page.tsx`**

This page shows when a user has no active organization. They can create one or accept a pending invitation.

```tsx
// src/app/dashboard/onboarding/page.tsx
"use client";

import { useState } from "react";
import { organization } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await organization.create({
      name: orgName,
      slug: slug || orgName.toLowerCase().replace(/\s+/g, "-"),
    });
    setLoading(false);
    if (error) {
      setError(error.message || "Could not create organization");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Create your workspace</h1>
        <p className="text-neutral-500 mb-6">
          Set up your team workspace to start tracking.
        </p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Workspace name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
              }}
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="Acme QA Team"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              URL slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="acme-qa"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard layout to check active org**

Update `src/app/dashboard/layout.tsx` to redirect to onboarding if no active organization is set. This will be a client component wrapper:

```tsx
// src/app/dashboard/layout.tsx
"use client";

import { useSession, organization } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const activeOrg = session?.session?.activeOrganizationId;
  const isOnboarding = pathname === "/dashboard/onboarding";

  useEffect(() => {
    if (!isPending && !activeOrg && !isOnboarding) {
      router.push("/dashboard/onboarding");
    }
  }, [isPending, activeOrg, isOnboarding, router]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (isOnboarding) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-60 border-r border-neutral-200 p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-6">Retrack</h2>
        <nav className="space-y-1 flex-1">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded-md text-sm hover:bg-neutral-100"
          >
            Projects
          </Link>
          <Link
            href="/dashboard/settings"
            className="block px-3 py-2 rounded-md text-sm hover:bg-neutral-100"
          >
            Settings
          </Link>
          <Link
            href="/dashboard/billing"
            className="block px-3 py-2 rounded-md text-sm hover:bg-neutral-100"
          >
            Billing
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add organization onboarding flow and dashboard layout"
```

---

### Task 8: Create Settings and Billing Pages

**Files:**
- Create: `src/app/dashboard/settings/page.tsx`, `src/app/dashboard/billing/page.tsx`

- [ ] **Step 1: Create settings page `src/app/dashboard/settings/page.tsx`**

```tsx
// src/app/dashboard/settings/page.tsx
"use client";

import { useSession, organization, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    organization.getFullOrganization().then(({ data }) => {
      if (data?.members) setMembers(data.members);
    });
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await organization.inviteMember({
      email: inviteEmail,
      role: inviteRole,
    });
    setInviteEmail("");
    setLoading(false);
    // Refresh members
    const { data } = await organization.getFullOrganization();
    if (data?.members) setMembers(data.members);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          Account
        </h2>
        <p className="text-sm text-neutral-700">
          {session?.user?.name} ({session?.user?.email})
        </p>
        <button
          onClick={() => signOut().then(() => router.push("/sign-in"))}
          className="mt-2 text-sm text-red-600 hover:underline"
        >
          Sign out
        </button>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          Team Members
        </h2>
        <ul className="space-y-2 mb-4">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.user?.name || m.user?.email}</span>
              <span className="text-neutral-400">{m.role}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="invite@example.com"
            required
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-md text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
            className="px-3 py-2 border border-neutral-300 rounded-md text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm hover:bg-neutral-800 disabled:opacity-50"
          >
            Invite
          </button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create billing page `src/app/dashboard/billing/page.tsx`**

```tsx
// src/app/dashboard/billing/page.tsx
"use client";

import { subscription, useSession } from "@/lib/auth-client";
import { useState, useEffect } from "react";

const PLANS = [
  {
    name: "free",
    label: "Free",
    price: "$0",
    features: ["1 member", "2 projects", "5 sections per project"],
  },
  {
    name: "team",
    label: "Team",
    price: "$19/mo",
    features: ["Up to 3 members", "10 projects", "Unlimited sections"],
  },
  {
    name: "business",
    label: "Business",
    price: "$49/mo",
    features: ["Up to 15 members", "Unlimited projects", "SSO", "Priority support"],
  },
];

export default function BillingPage() {
  const { data: session } = useSession();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.session?.activeOrganizationId) return;
    subscription.list({
      query: { referenceId: session.session.activeOrganizationId },
    }).then(({ data }) => {
      const active = data?.find(
        (s: any) => s.status === "active" || s.status === "trialing"
      );
      if (active?.plan) setCurrentPlan(active.plan);
    });
  }, [session]);

  const handleUpgrade = async (plan: string) => {
    if (plan === "free" || plan === currentPlan) return;
    setLoading(plan);
    await subscription.upgrade({
      plan,
      referenceId: session!.session.activeOrganizationId!,
      successUrl: "/dashboard/billing",
      cancelUrl: "/dashboard/billing",
    });
    setLoading(null);
  };

  const handleManage = async () => {
    await subscription.billingPortal({
      referenceId: session!.session.activeOrganizationId!,
      returnUrl: "/dashboard/billing",
    });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-6">Billing</h1>

      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`border rounded-lg p-4 ${
              currentPlan === plan.name
                ? "border-neutral-900 ring-1 ring-neutral-900"
                : "border-neutral-200"
            }`}
          >
            <h3 className="font-bold">{plan.label}</h3>
            <p className="text-2xl font-bold mt-1">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              {plan.features.map((f) => (
                <li key={f}>- {f}</li>
              ))}
            </ul>
            <div className="mt-4">
              {currentPlan === plan.name ? (
                <span className="text-sm text-neutral-500">Current plan</span>
              ) : plan.name === "free" ? null : (
                <button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={loading === plan.name}
                  className="w-full py-2 bg-neutral-900 text-white text-sm rounded-md hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading === plan.name ? "Redirecting..." : "Upgrade"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentPlan !== "free" && (
        <button
          onClick={handleManage}
          className="mt-6 text-sm text-neutral-600 hover:underline"
        >
          Manage subscription in Stripe
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add settings and billing pages"
```
