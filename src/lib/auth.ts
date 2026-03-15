import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { eq, and, gt, asc } from "drizzle-orm";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";

const stripeClient = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_placeholder_for_build"
);

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
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;

      const newSession = ctx.context.newSession;
      if (!newSession?.user?.id || !newSession?.user?.email) return;

      const userId = newSession.user.id;
      const userEmail = newSession.user.email;

      // Parse invitation token from request URL query params
      let invitationToken: string | null = null;
      try {
        const url = new URL(ctx.request?.url ?? "");
        invitationToken = url.searchParams.get("invitation");
      } catch {
        // URL parsing failed, continue without token
      }

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
    }),
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: false,
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
      },
      organization: {
        enabled: true,
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
